"use client"
import { useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { z } from "zod"
import { toast } from "sonner"
import { MapPin, Package, Truck } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { syncSession } from "@/features/auth/api/session-store"
import { currentSession } from "@/features/auth/api/refresh-session"
import { GettyApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ValidatedForm,
  FormSelect,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import OrderSummaryCard from "@/components/customer/orders/order-summary-card"
import ContentError from "@/components/shared/content-error"
import { OrdersSkeleton } from "@/components/shared/loading-skeletons"
import StatusBadge from "@/components/admin/shared/status-badge"
import { formatOrderAmount as formatCurrency } from "../utils/format-order-amount"
import {
  getOrder,
  actOnOrderLine,
  cancelOrder,
  canCustomerCancelOrder,
  availableLineActions,
  type ManagedOrder,
  type OrderLine,
  type OrderAction,
} from "../api/order-management"
import {
  prepareOrderAction,
  clearOrderAction,
  pendingOrderAction,
} from "../api/action-recovery"
import FulfilmentActionDialog from "./fulfilment-action-dialog"
import ParcelPhoto from "./parcel-photo"
import RefundProgress from "./refund-progress"
import { fulfilmentHistoryAction } from "../api/parcel-photo"
import RateProductDialog from "@/features/products/components/store/rate-product-dialog"

const actionLabels: Record<OrderAction | "cancel-order", string> = {
  cancel: "Cancel item",
  "request-return": "Request return",
  "approve-return": "Approve return",
  "reject-return": "Reject return",
  "receive-return": "Receive return",
  "cancel-order": "Cancel order",
}
type SelectedAction = { action: OrderAction | "cancel-order"; line?: OrderLine }
const itemStatusLabels: Record<OrderLine["status"], string> = {
  pending: "Awaiting fulfilment",
  accepted: "Preparing your items",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
}
const historyLabels: Record<string, string> = {
  placed: "Order placed",
  "payment-started": "Payment initiated",
  "charge-succeeded": "Payment received",
  "charge-failed": "Payment failed",
  "refund-started": "Refund initiated",
  "refund-succeeded": "Refund completed",
}
const deliverySteps = [
  {
    key: "placed",
    label: "Order placed",
    detail: "Order received by Getty",
  },
  {
    key: "preparing",
    label: "Preparing your order",
    detail: "Items gathered and prepared",
  },
  {
    key: "ready",
    label: "Ready for delivery",
    detail: "Packed for handoff",
  },
  {
    key: "dispatched",
    label: "On the way",
    detail: "Travelling to your address",
  },
  {
    key: "delivered",
    label: "Delivered",
    detail: "Handed over at your address",
  },
] as const
function formatDeliveryDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(parsed)
}
export function ActionDialog({
  order,
  selection,
  workspace,
  onClose,
  onUpdated,
}: {
  order: ManagedOrder
  selection: SelectedAction
  workspace: "customer" | "supplier" | "admin"
  onClose: () => void
  onUpdated: () => Promise<unknown>
}) {
  const { data: session } = useAuthSession()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false)
  const running = useRef(false)
  const [expectedSession] = useState(syncSession)
  const scope = `${expectedSession.user?.id}:${order.id}:${selection.line?.id ?? "order"}:${selection.action}`
  const [pending, setPending] = useState(() => {
    try {
      return pendingOrderAction(scope)
    } catch {
      return null
    }
  })
  const action = selection.action,
    reasonRequired = action.includes("cancel") || action.includes("return")
  const schema = z.object({
    reason: reasonRequired
      ? z.string().trim().min(1, "Enter a reason.").max(1000)
      : z.string().optional(),
    restock:
      action === "receive-return"
        ? z.enum(["true", "false"], {
            error: "Choose a stock decision after inspection.",
          })
        : z.string().optional(),
  })
  async function submit(values: z.infer<typeof schema>) {
    if (running.current || !session?.user || conflict) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      currentSession(expectedSession)
      const version =
        typeof pending?.version === "number"
          ? pending.version
          : (selection.line?.version ?? order.version)
      if (!version)
        throw new Error("Refresh the order to load its current revision.")
      if (action === "cancel-order") {
        const body = prepareOrderAction(scope, {
          version,
          reason: values.reason!,
        })
        setPending(body)
        currentSession(expectedSession)
        await cancelOrder(order.id, body)
      } else {
        const body = prepareOrderAction(scope, {
          version,
          action,
          ...(reasonRequired ? { reason: values.reason } : {}),
          ...(action === "receive-return"
            ? { restock: values.restock === "true" }
            : {}),
        })
        setPending(body)
        currentSession(expectedSession)
        await actOnOrderLine(
          workspace === "customer" ? "customer" : "vendor",
          order.id,
          selection.line!.id,
          body
        )
      }
      currentSession(expectedSession)
      clearOrderAction(scope)
      toast.success(
        action.includes("cancel")
          ? "Cancellation recorded. Any refund will be processed separately."
          : "Order updated."
      )
      await onUpdated()
      onClose()
    } catch (cause) {
      if (syncSession().sessionId !== expectedSession.sessionId) {
        setError(
          "Your account changed. This action is saved under the original account; sign back in to check it."
        )
        return
      }
      if (
        cause instanceof GettyApiError &&
        [400, 403, 404, 409, 422].includes(cause.status)
      ) {
        clearOrderAction(scope)
        setPending(null)
      }
      if (cause instanceof GettyApiError && cause.status === 409) {
        clearOrderAction(scope)
        setConflict(true)
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn’t confirm the update. Retry the same action."
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>{actionLabels[action]}</DialogTitle>
        <DialogDescription>
          {selection.line?.name ?? order.reference}.{" "}
          {action === "receive-return"
            ? "Confirm the returned items were received and inspected before choosing whether to restock."
            : action === "cancel-order"
              ? "Cancel this order before dispatch. If you have paid, any eligible refund is processed separately."
              : action.includes("cancel")
                ? "This cancels the entire quantity. Eligible refunds are processed separately."
                : "Confirm this change to the order."}
        </DialogDescription>
        <ValidatedForm
          schema={schema}
          defaultValues={{
            reason: String(pending?.reason ?? ""),
            restock:
              pending?.restock === undefined ? "" : String(pending.restock),
          }}
          onSubmit={submit}
          className="space-y-4"
        >
          <fieldset
            disabled={busy || conflict || Boolean(pending)}
            className="space-y-4"
          >
            {reasonRequired && (
              <div>
                <label
                  htmlFor="order-action-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Reason
                </label>
                <FormTextarea
                  id="order-action-reason"
                  name="reason"
                  className="min-h-24"
                />
              </div>
            )}
            {action === "receive-return" && (
              <div>
                <label
                  htmlFor="order-restock"
                  className="mb-2 block text-sm font-medium"
                >
                  Stock decision
                </label>
                <FormSelect
                  className="form-input"
                  id="order-restock"
                  name="restock"
                >
                  <option value="">Choose after inspection</option>
                  <option value="false">Do not return to stock</option>
                  <option value="true">
                    Safe for resale — return to stock
                  </option>
                </FormSelect>
              </div>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
              {conflict
                ? " Refresh and review the latest order before trying again."
                : " If the connection was interrupted, retrying the same values is safe."}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Close
            </Button>
            {conflict ? (
              <Button
                type="button"
                onClick={async () => {
                  await onUpdated()
                  onClose()
                }}
              >
                Review latest order
              </Button>
            ) : (
              <Button type="submit" disabled={busy}>
                {busy ? "Updating…" : actionLabels[action]}
              </Button>
            )}
          </DialogFooter>
        </ValidatedForm>
      </DialogContent>
    </Dialog>
  )
}
export default function OrderDetail({
  orderId,
  workspace,
}: {
  orderId: string
  workspace: "customer" | "supplier" | "admin"
}) {
  const { data: session } = useAuthSession(),
    client = useQueryClient()
  const audience = workspace === "customer" ? "customer" : "vendor"
  const [selection, setSelection] = useState<SelectedAction | null>(null)
  const [ratingLine, setRatingLine] = useState<OrderLine | null>(null)
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(
    () => new Set()
  )
  const [confirmReceipt, setConfirmReceipt] = useState(false)
  const [tab, setTab] = useState("items")
  const query = useQuery({
    queryKey: ["order", session?.user?.id, audience, orderId],
    queryFn: () => getOrder(audience, orderId),
    enabled: Boolean(session?.user),
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 15_000
        : false,
  })
  const refresh = async () => {
    await Promise.all([
      query.refetch(),
      client.invalidateQueries({ queryKey: ["orders"] }),
    ])
  }
  if (query.isPending) return <OrdersSkeleton />
  if (query.isError)
    return (
      <ContentError
        title="We couldn’t load this order"
        description={query.error.message}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    )
  const order = query.data,
    date = (value: string) =>
      new Date(value).toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      })
  const cancellable = audience === "customer" && canCustomerCancelOrder(order)
  const paid = order.payments?.some(
    (payment) => payment.kind === "charge" && payment.status === "succeeded"
  )
  const deliveryStage =
    order.status === "pending" && !paid
      ? "Awaiting payment"
      : order.status === "cancelled"
        ? "Cancelled"
        : order.status === "expired"
          ? "Expired"
          : order.fulfilment
            ? {
                placed: "Order placed",
                preparing: "Preparing your order",
                ready: "Packed and ready",
                dispatched: "On the way",
                delivered: "Delivered",
                cancelled: "Cancelled",
                expired: "Expired",
              }[order.fulfilment]
            : "Stage unavailable"
  const deliveryStepIndex = deliverySteps.findIndex(
    (step) => step.key === order.fulfilment
  )
  const lastRecordedStep = deliverySteps.reduce((latest, step, index) => {
    return order.history?.some(
      (event) => event.action === fulfilmentHistoryAction[step.key]
    )
      ? Math.max(latest, index)
      : latest
  }, -1)
  const reachedStepIndex =
    deliveryStepIndex >= 0 ? deliveryStepIndex : lastRecordedStep
  const deliveryClosed = ["cancelled", "expired"].includes(order.status)
  const deliveryWindow = [
    order.deliveryQuote?.earliest,
    order.deliveryQuote?.latest,
  ]
    .filter((value): value is string => Boolean(value))
    .map(formatDeliveryDate)
    .join(" – ")
  const productNames = order.items
    .map((line) => line.name.trim())
    .filter(Boolean)
  const orderTitle =
    productNames.length === 0
      ? "Order details"
      : productNames.length === 1
        ? productNames[0]
        : `${productNames[0]} and ${productNames.length - 1} more ${productNames.length === 2 ? "product" : "products"}`
  const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0)
  const tabs = [
    "items",
    "delivery",
    ...(audience === "customer" ? ["payments"] : []),
    "history",
  ]
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {orderTitle}
          </h1>
          <p className="text-muted-foreground text-sm">
            Order reference:{" "}
            <span className="text-foreground font-medium">
              {order.orderCode ?? order.reference}
            </span>
          </p>
          <p className="text-muted-foreground text-xs leading-5">
            Placed {date(order.placed)} · Africa/Lagos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          {audience === "customer" && paid && (
            <StatusBadge status="paid" label="Payment received" />
          )}
        </div>
      </div>
      {audience === "customer" && tab !== "delivery" && (
        <section
          aria-label="Current delivery stage"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white px-5 py-4 sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-full">
              <Truck className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium">
                Delivery progress
              </p>
              <p className="mt-0.5 font-semibold text-[#183f2e]">
                {deliveryStage}
              </p>
              {deliveryWindow && !deliveryClosed && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Estimated {deliveryWindow}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTab("delivery")}
          >
            View progress
          </Button>
        </section>
      )}
      {(cancellable ||
        (audience === "customer" && order.status === "pending")) && (
        <div className="flex flex-wrap gap-3">
          {audience === "customer" && order.status === "pending" && (
            <Link
              href={`/checkout/callback?order=${encodeURIComponent(order.id)}`}
              className="bg-primary inline-flex min-h-11 items-center rounded-lg px-5 font-semibold text-white"
            >
              Continue to payment
            </Link>
          )}
          {cancellable && (
            <Button
              variant="outline"
              onClick={() => setSelection({ action: "cancel-order" })}
            >
              Cancel order
            </Button>
          )}
        </div>
      )}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <div
            className="flex gap-1 overflow-x-auto border-b"
            role="tablist"
            aria-label="Order details"
          >
            {tabs.map((value) => (
              <button
                key={value}
                id={`order-tab-${value}`}
                aria-controls={`order-panel-${value}`}
                role="tab"
                type="button"
                aria-selected={tab === value}
                className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-medium capitalize ${tab === value ? "border-primary text-primary" : "text-muted-foreground border-transparent"}`}
                onClick={() => setTab(value)}
                onKeyDown={(event) => {
                  if (
                    ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                      event.key
                    )
                  ) {
                    event.preventDefault()
                    const index = tabs.indexOf(value)
                    const next =
                      event.key === "Home"
                        ? tabs[0]
                        : event.key === "End"
                          ? tabs[tabs.length - 1]
                          : tabs[
                              (index +
                                (event.key === "ArrowRight" ? 1 : -1) +
                                tabs.length) %
                                tabs.length
                            ]
                    setTab(next)
                    document.getElementById(`order-tab-${next}`)?.focus()
                  }
                }}
                tabIndex={tab === value ? 0 : -1}
              >
                {value}
              </button>
            ))}
          </div>
          <section
            id={`order-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`order-tab-${tab}`}
            className="min-w-0 space-y-4"
          >
            {tab === "items" && order.items.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {itemCount} {itemCount === 1 ? "item" : "items"} in this order
              </p>
            )}
            {tab === "items" &&
              order.items.map((line) => (
                <article
                  key={line.id}
                  className="rounded-xl border bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 basis-48">
                      <h2 className="font-semibold break-words">{line.name}</h2>
                      <p className="text-muted-foreground mt-1 text-sm capitalize">
                        {line.unit}
                        {line.pack > 1 ? ` of ${line.pack}` : ""}
                      </p>
                      {line.options &&
                        Object.entries(line.options).some(
                          ([, value]) => value != null && value !== ""
                        ) && (
                          <p className="text-muted-foreground mt-2 text-sm break-words">
                            {Object.entries(line.options)
                              .filter(
                                ([, value]) => value != null && value !== ""
                              )
                              .map(([key, value]) => `${key}: ${String(value)}`)
                              .join(" · ")}
                          </p>
                        )}
                    </div>
                    {(line.status === "cancelled" ||
                      line.status === "returned" ||
                      (line.status === "pending" &&
                        order.status === "pending")) && (
                      <StatusBadge
                        status={line.status}
                        label={
                          line.status === "pending"
                            ? "Awaiting payment"
                            : itemStatusLabels[line.status]
                        }
                      />
                    )}
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-[#f8faf9] p-4 sm:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Quantity
                      </dt>
                      <dd className="mt-1.5 text-sm font-medium tabular-nums">
                        {line.quantity}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Unit price
                      </dt>
                      <dd className="mt-1.5 text-sm font-medium break-words tabular-nums">
                        {formatCurrency(line.price, order.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Delivery
                      </dt>
                      <dd className="mt-1.5 text-sm font-medium tabular-nums">
                        {line.shipping == null
                          ? "—"
                          : formatCurrency(line.shipping, order.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Item total
                      </dt>
                      <dd className="mt-1.5 text-sm font-semibold break-words tabular-nums">
                        {formatCurrency(line.total, order.currency)}
                      </dd>
                    </div>
                  </dl>
                  {(line.discount ?? 0) > 0 && (
                    <p className="text-primary mt-3 text-xs">
                      Discount: {formatCurrency(line.discount!, order.currency)}
                    </p>
                  )}
                  {line.returnstate !== "none" && (
                    <p className="mt-3 text-sm">
                      Return:{" "}
                      <span className="font-medium capitalize">
                        {line.returnstate}
                      </span>
                    </p>
                  )}
                  {(availableLineActions(audience, order, line).length > 0 ||
                    (audience === "customer" &&
                      line.canReview === true &&
                      !reviewedProducts.has(line.product))) && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {availableLineActions(audience, order, line).map(
                        (action) => (
                          <Button
                            key={action}
                            variant="outline"
                            onClick={() => setSelection({ action, line })}
                          >
                            {actionLabels[action]}
                          </Button>
                        )
                      )}
                      {audience === "customer" &&
                        line.canReview === true &&
                        !reviewedProducts.has(line.product) && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRatingLine(line)}
                          >
                            Write a review
                          </Button>
                        )}
                    </div>
                  )}
                </article>
              ))}
            {tab === "delivery" && (
              <div className="min-w-0 overflow-hidden rounded-xl border bg-white">
                <div className="border-b px-5 py-5 sm:px-7">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      Delivery progress
                    </h2>
                    {reachedStepIndex >= 0 && !deliveryClosed && (
                      <p className="text-muted-foreground text-sm">
                        Step {reachedStepIndex + 1} of {deliverySteps.length}
                      </p>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Updates for your whole order
                  </p>
                  {deliveryClosed && (
                    <p className="text-muted-foreground mt-2 text-sm">
                      Delivery stopped when this order {order.status}.
                    </p>
                  )}
                </div>
                <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
                  <ol className="min-w-0" aria-label="Order delivery timeline">
                    {deliverySteps.map((step, index) => {
                      const reached = index <= reachedStepIndex
                      const current =
                        index === reachedStepIndex && !deliveryClosed
                      const event = order.history?.find(
                        (entry) =>
                          entry.action === fulfilmentHistoryAction[step.key]
                      )
                      const occurredAt = reached
                        ? (event?.entry ??
                          (step.key === "placed" ? order.placed : null))
                        : null
                      return (
                        <li
                          key={step.key}
                          aria-current={current ? "step" : undefined}
                          className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 pb-8 last:pb-0"
                        >
                          {index < deliverySteps.length - 1 && (
                            <span
                              aria-hidden
                              className="absolute top-10 bottom-0 left-[1.22rem] w-px bg-[#cbd6ce]"
                            />
                          )}
                          <span
                            aria-hidden
                            className={`relative z-10 grid size-10 place-items-center rounded-full text-base font-semibold ${current ? "bg-primary text-white ring-4 ring-[#e5f0e8]" : "border border-[#bdcbc0] bg-white text-[#34473a]"}`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 pt-1">
                            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                              <h3
                                className={`text-base leading-6 font-semibold sm:text-lg ${current ? "text-primary" : "text-[#263a2d]"}`}
                              >
                                {step.label}
                              </h3>
                              {occurredAt && (
                                <time
                                  dateTime={occurredAt}
                                  className="shrink-0 rounded-full bg-[#f1f6f2] px-2.5 py-1 text-xs text-[#51715b]"
                                >
                                  {date(occurredAt)}
                                </time>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm leading-6">
                              {step.detail}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                  <div className="space-y-4">
                    {audience === "customer" && (
                      <ParcelPhoto
                        orderId={order.id}
                        photo={order.parcelPhoto}
                      />
                    )}
                    {deliveryWindow && !deliveryClosed && (
                      <div className="rounded-lg bg-[#f3f8f4] p-4">
                        <p className="text-xs font-semibold tracking-wide text-[#49735b] uppercase">
                          Estimated arrival
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#183f2e]">
                          {deliveryWindow}
                        </p>
                        {order.deliveryQuote?.estimateOnly && (
                          <p className="text-muted-foreground mt-2 text-xs leading-5">
                            This delivery window may change.
                          </p>
                        )}
                      </div>
                    )}
                    {order.delivery && (
                      <div className="rounded-lg border p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <MapPin className="text-primary size-4" aria-hidden />
                          Delivering to
                        </h3>
                        <address className="mt-3 space-y-1 text-sm leading-6 break-words not-italic">
                          <p className="font-medium">{order.delivery.name}</p>
                          <p>{order.delivery.address}</p>
                          <p>
                            {[
                              order.delivery.city,
                              order.delivery.state,
                              order.delivery.postcode,
                              order.delivery.country === "NG"
                                ? "Nigeria"
                                : order.delivery.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          <p className="text-muted-foreground">
                            {order.delivery.phone}
                          </p>
                        </address>
                      </div>
                    )}
                  </div>
                </div>
                {order.tracking &&
                  (order.tracking.carrier || order.tracking.reference) && (
                    <p className="border-t px-5 py-4 text-sm break-words sm:px-7">
                      {order.tracking.carrier
                        ? `Carrier: ${order.tracking.carrier}`
                        : ""}
                      {order.tracking.reference
                        ? ` · Tracking: ${order.tracking.reference}`
                        : ""}
                    </p>
                  )}
                {order.fulfilment === "dispatched" && order.version && (
                  <div className="border-t bg-[#f2f8f3] px-5 py-5 sm:px-7">
                    <p className="text-sm">
                      Received the entire remaining order? Confirm receipt only
                      after checking every item. If anything is missing, contact
                      Getty support.
                    </p>
                    <Button
                      className="mt-3"
                      onClick={() => setConfirmReceipt(true)}
                    >
                      Confirm receipt of my order
                    </Button>
                  </div>
                )}
                {order.notes && (
                  <div className="border-t px-5 py-5 sm:px-7">
                    <h3 className="text-sm font-medium">Delivery note</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
                      {order.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
            {tab === "payments" && (
              <div className="min-w-0 rounded-xl border bg-white p-5 sm:p-6">
                <h2 className="font-semibold">Payment history</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Payments and refunds recorded for this order.
                </p>
                {!order.payments?.some(
                  (payment) => payment.kind === "charge"
                ) ? (
                  <p className="mt-6 text-sm">No payment attempts recorded.</p>
                ) : (
                  <ul className="mt-5 divide-y">
                    {order.payments
                      .filter((payment) => payment.kind === "charge")
                      .map((payment) => (
                        <li
                          key={payment.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">
                                {payment.kind === "charge"
                                  ? "Payment"
                                  : "Refund"}
                              </p>
                              <StatusBadge
                                status={payment.status}
                                label={
                                  payment.status === "succeeded"
                                    ? payment.kind === "charge"
                                      ? "Paid"
                                      : "Refunded"
                                    : undefined
                                }
                              />
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                              {payment.settled
                                ? date(payment.settled)
                                : ["created", "pending", "unknown"].includes(
                                      payment.status
                                    )
                                  ? "Awaiting confirmation"
                                  : "Not settled"}
                            </p>
                            {payment.method && (
                              <p className="text-muted-foreground mt-1 text-sm capitalize">
                                {payment.method}
                              </p>
                            )}
                          </div>
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                        </li>
                      ))}
                  </ul>
                )}
                {audience === "customer" && (
                  <RefundProgress order={order} onRefresh={refresh} />
                )}
              </div>
            )}
            {tab === "history" && (
              <div className="min-w-0 rounded-xl border bg-white p-5 sm:p-6">
                <h2 className="font-semibold">Order history</h2>
                {!order.history?.length ? (
                  <p className="text-muted-foreground mt-4 text-sm">
                    No history entries yet.
                  </p>
                ) : (
                  <ol className="mt-5 space-y-5 border-l border-[#e3e9e5] pl-5">
                    {[...order.history]
                      .filter((event) =>
                        /^(placed|payment-|charge-|refund-|fulfilment-|cancel|item-cancel|return|item-return)/i.test(
                          event.action
                        )
                      )
                      .sort((a, b) => Date.parse(b.entry) - Date.parse(a.entry))
                      .map((event) => (
                        <li className="relative" key={event.id}>
                          <span
                            className="bg-primary absolute top-1.5 -left-[1.55rem] size-2 rounded-full"
                            aria-hidden
                          />
                          <p className="font-medium break-words capitalize">
                            {historyLabels[event.action] ??
                              event.action.replaceAll("-", " ")}
                          </p>
                          {event.after && !historyLabels[event.action] && (
                            <p className="text-muted-foreground mt-1 text-sm capitalize">
                              {event.after}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-1 text-sm">
                            {date(event.entry)}
                          </p>
                          {event.reason && (
                            <p className="mt-2 text-sm break-words">
                              {event.reason}
                            </p>
                          )}
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            )}
            {tab === "items" && !order.items.length && (
              <p className="rounded-xl border bg-white p-6">
                <Package className="mb-3 size-5" aria-hidden />
                No items returned for this order.
              </p>
            )}
          </section>
        </div>
        <aside className="min-w-0 space-y-4">
          <OrderSummaryCard
            subtotal={order.subtotal}
            delivery={order.shipping}
            discount={order.discount}
            total={order.total}
            currency={order.currency}
            commission={order.commission}
            vendor={audience === "vendor"}
          />
        </aside>
      </div>
      {selection && (
        <ActionDialog
          order={order}
          selection={selection}
          workspace={workspace}
          onClose={() => setSelection(null)}
          onUpdated={refresh}
        />
      )}
      {ratingLine && (
        <RateProductDialog
          product={ratingLine.product}
          item={ratingLine.id}
          name={ratingLine.name}
          onClose={() => setRatingLine(null)}
          onSubmitted={() => {
            setReviewedProducts((current) =>
              new Set(current).add(ratingLine.product)
            )
            setRatingLine(null)
            void refresh()
          }}
          onEligibilityChanged={(status) => {
            if (status === 409)
              setReviewedProducts((current) =>
                new Set(current).add(ratingLine.product)
              )
            void refresh()
          }}
        />
      )}
      {confirmReceipt && order.version && (
        <FulfilmentActionDialog
          orderId={order.id}
          selection={{ action: "deliver", version: order.version }}
          audience="customer"
          onClose={() => setConfirmReceipt(false)}
          onSuccess={(result) => {
            client.setQueryData(
              ["order", session?.user?.id, "customer", orderId],
              result
            )
            void client.invalidateQueries({ queryKey: ["orders"] })
          }}
          onRefresh={refresh}
        />
      )}
    </div>
  )
}
