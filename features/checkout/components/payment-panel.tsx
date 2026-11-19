"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import ContentError from "@/components/shared/content-error"
import { GettyApiError } from "@/lib/api/errors"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { readSession } from "@/features/auth/api/session-store"
import {
  awaitingPayment,
  blockingCharge,
  getPayment,
  getPurchase,
  hostedPaymentLink,
  money,
  startPayment,
} from "../api/checkout"
import {
  paymentOperation,
  readRecovery,
  rememberPayment,
} from "../api/recovery"

export default function PaymentPanel({
  orderId,
  returnPage = false,
  autoContinue = false,
}: {
  orderId: string
  returnPage?: boolean
  autoContinue?: boolean
}) {
  const account = useAuthSession().data?.user?.id ?? ""
  return (
    <PaymentStatus
      key={`${account}:${orderId}`}
      account={account}
      orderId={orderId}
      returnPage={returnPage}
      autoContinue={autoContinue}
    />
  )
}

function PaymentStatus({
  account,
  orderId,
  returnPage,
  autoContinue,
}: {
  account: string
  orderId: string
  returnPage: boolean
  autoContinue: boolean
}) {
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState(
    () => readRecovery(account).payments[orderId]?.id
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [clock, setClock] = useState(() => Date.now())
  const [pollStarted, setPollStarted] = useState(() => Date.now())
  const submitting = useRef(false)
  const redirectRequested = useRef(autoContinue)
  const redirecting = useRef(false)
  const orderQuery = useQuery({
    queryKey: ["purchase-payment", account, orderId],
    enabled: Boolean(account),
    queryFn: ({ signal }) => getPurchase(orderId, signal),
    retry: false,
  })
  const order = orderQuery.data
  const blocking = order && blockingCharge(order)
  const paymentId =
    blocking?.id ??
    selectedId ??
    order?.payments.filter((p) => p.kind === "charge").at(-1)?.id
  const paymentQuery = useQuery({
    queryKey: ["purchase-attempt", account, orderId, paymentId],
    enabled: Boolean(account && order && paymentId),
    queryFn: ({ signal }) => getPayment(orderId, paymentId!, signal),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (
        query.state.error ||
        Date.now() - pollStarted > 120000 ||
        (status && !["created", "pending", "unknown"].includes(status))
      )
        return false
      return Date.now() - pollStarted < 15000 ? 2000 : 5000
    },
    refetchIntervalInBackground: false,
  })
  const payment = paymentQuery.data
  const paymentStatus = payment?.status
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (paymentStatus)
      void client.invalidateQueries({
        queryKey: ["purchase-payment", account, orderId],
      })
  }, [client, account, orderId, paymentStatus])
  const link =
    order && !orderQuery.isFetching && !paymentQuery.isError
      ? hostedPaymentLink(order, payment, clock)
      : null
  useEffect(() => {
    if (
      !returnPage &&
      redirectRequested.current &&
      link &&
      !redirecting.current
    ) {
      redirecting.current = true
      window.location.assign(link)
    }
  }, [link, returnPage])

  async function beginPayment() {
    if (submitting.current) return
    submitting.current = true
    redirectRequested.current = true
    setBusy(true)
    setError("")
    const sessionId = readSession().sessionId
    try {
      const latest = await getPurchase(orderId)
      if (readSession().user?.id !== account) return
      client.setQueryData(["purchase-payment", account, orderId], latest)
      const existing = blockingCharge(latest)
      if (existing) {
        setSelectedId(existing.id)
        return
      }
      if (!awaitingPayment(latest))
        throw new Error(
          "This order is no longer awaiting payment. Check its latest status."
        )
      const saved = readRecovery(account).payments[orderId]
      let previous = saved?.id && latest.payments.find((p) => p.id === saved.id)
      if (saved?.id && !previous) {
        previous = await getPayment(orderId, saved.id)
        if (
          ["created", "pending", "unknown", "succeeded"].includes(
            previous.status
          )
        ) {
          setSelectedId(previous.id)
          return
        }
      }
      const operation = paymentOperation(
        account,
        orderId,
        Boolean(previous && ["failed", "cancelled"].includes(previous.status))
      )
      if (
        readSession().user?.id !== account ||
        readSession().sessionId !== sessionId
      )
        return
      const result = await startPayment(orderId, operation.token)
      rememberPayment(account, orderId, operation.token, result.id)
      if (readSession().user?.id !== account) return
      setSelectedId(result.id)
      setPollStarted(Date.now())
      client.setQueryData(
        ["purchase-attempt", account, orderId, result.id],
        result
      )
      void orderQuery.refetch()
    } catch (e) {
      redirectRequested.current = false
      setError(
        e instanceof GettyApiError && e.status === 503
          ? "Online payment is temporarily unavailable. Your order is saved; try again later or contact support."
          : e instanceof Error
            ? e.message
            : "We couldn't start payment. Retry this request or check your order."
      )
      void orderQuery.refetch()
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  if (orderQuery.isPending)
    return (
      <div role="status" className="rounded-2xl border bg-white p-8">
        Loading your order…
      </div>
    )
  if (orderQuery.isError || !order)
    return (
      <ContentError
        title="We couldn’t load this order"
        description={orderQuery.error?.message}
        onRetry={() => void orderQuery.refetch()}
      />
    )
  const closed = ["cancelled", "expired"].includes(order.status)
  const confirmed = [
    "confirmed",
    "processing",
    "shipped",
    "completed",
  ].includes(order.status)
  const paid = payment?.kind === "charge" && payment.status === "succeeded"
  const unsupportedPaymentLink =
    payment?.kind === "charge" &&
    payment.status === "pending" &&
    Boolean(payment.link) &&
    awaitingPayment(order, clock) &&
    !link &&
    !orderQuery.isFetching &&
    !paymentQuery.isError
  const preparingPaymentLink =
    payment?.kind === "charge" &&
    (payment.status === "created" ||
      (payment.status === "pending" && !payment.link))
  const canPay =
    !blocking &&
    !(
      payment?.kind === "charge" &&
      ["created", "pending", "unknown", "succeeded"].includes(payment.status)
    ) &&
    !paymentQuery.isFetching &&
    !paymentQuery.isError &&
    awaitingPayment(order, clock)
  const seconds = Math.max(
    0,
    Math.ceil(((order.expires ? Date.parse(order.expires) : 0) - clock) / 1000)
  )
  const title = closed
    ? payment?.status === "unknown"
      ? `Order ${order.status} · payment under review`
      : `Order ${order.status}`
    : confirmed
      ? "Your order is confirmed"
      : paid
        ? "Payment received · checking your order"
        : payment?.status === "unknown"
          ? "Your payment is being checked"
          : payment?.status === "created"
            ? "Preparing secure payment"
            : payment?.status === "failed"
              ? "Payment was unsuccessful"
              : payment?.status === "cancelled"
                ? "Payment attempt closed"
                : returnPage && payment
                  ? "Checking your payment"
                  : "Complete your order"
  return (
    <section className="min-w-0 rounded-2xl border bg-white p-5 sm:p-8">
      {confirmed ? (
        <CheckCircle2 aria-hidden className="text-primary size-9" />
      ) : (
        <CreditCard aria-hidden className="text-primary size-9" />
      )}
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
      <dl className="mt-6 space-y-3 border-y py-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Products (tax included)</dt>
          <dd>{money(order.subtotal, order.currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Delivery</dt>
          <dd>{money(order.shipping, order.currency)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-lg font-semibold">
          <dt>Total</dt>
          <dd>{money(order.total, order.currency)}</dd>
        </div>
      </dl>
      <div role="status" className="mt-5 text-sm leading-6 text-[#526459]">
        {closed
          ? paid
            ? "Payment was received after this order closed. Check your order for refund progress."
            : payment?.status === "unknown"
              ? "The order’s payment window has ended, but Getty has not confirmed the outcome of this payment attempt. Contact support before placing another order."
              : "This order is closed. Open the order to review its status and any refunds."
          : confirmed
            ? "We’ve received your order. Follow each item's delivery progress in your orders."
            : payment?.status === "unknown"
              ? "Getty has not resolved this payment attempt yet. We can’t safely open checkout or start another charge until its status is confirmed. Refresh this page later, or contact support if this continues."
              : preparingPaymentLink
                ? returnPage
                  ? "Getty is preparing your secure payment link. Check this page again shortly."
                  : "Preparing your secure payment link. The payment page will open when it is ready."
                : paid
                  ? "Your payment has been verified. We’re waiting for the latest order status."
                  : payment?.failure || null}
        {payment?.status === "unknown" && payment.failure && (
          <p className="mt-2">Getty reports: {payment.failure}</p>
        )}
        {order.status === "pending" && (
          <p className="mt-2">
            {seconds > 0
              ? `Stock reserved for ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.`
              : "The payment window has ended. Check your order status."}
          </p>
        )}
        {payment &&
          ["created", "pending", "unknown"].includes(payment.status) &&
          clock - pollStarted > 120000 && (
            <p className="mt-2">
              Automatic checks have paused. Refresh this page to check again.
            </p>
          )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {paymentQuery.isError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          We couldn’t check this payment. {paymentQuery.error.message}
        </p>
      )}
      {unsupportedPaymentLink && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          This payment link could not be verified. Please contact support before
          trying again.
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {link && (
          <a
            className="bg-primary inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold text-white"
            href={link}
            referrerPolicy="no-referrer"
          >
            Proceed to payment
          </a>
        )}
        {canPay && (
          <Button
            disabled={busy || orderQuery.isFetching}
            onClick={() => void beginPayment()}
          >
            {busy
              ? "Starting payment…"
              : payment
                ? "Try payment again"
                : "Proceed to payment"}
          </Button>
        )}
        <Link
          className="text-primary inline-flex min-h-11 items-center px-2 text-sm font-semibold"
          href={`/customer/orders/${order.id}`}
        >
          View order
        </Link>
      </div>
      {order.payments.some((p) => p.kind === "refund") && (
        <p className="mt-4 text-sm">
          Refund status:{" "}
          {order.payments
            .filter((p) => p.kind === "refund")
            .map((p) => `${money(p.amount, p.currency)} — ${p.status}`)
            .join("; ")}
        </p>
      )}
    </section>
  )
}
