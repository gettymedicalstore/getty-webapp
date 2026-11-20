"use client"
import Link from "next/link"
import { useState } from "react"
import { GettyIdSchema } from "@/lib/api/getty-contract"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { authHref, reauthenticationHref } from "@/lib/auth/navigation"
import { readRecovery } from "../api/recovery"
import PaymentPanel from "./payment-panel"

export default function PaymentReturn({
  order,
  autoContinue = false,
  returnPage = true,
}: {
  order?: string
  autoContinue?: boolean
  returnPage?: boolean
}) {
  const session = useAuthSession()
  const user = session.data?.user
  const account = user?.id
  if (session.isPending)
    return (
      <div className="site-container py-8 sm:py-12">
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 sm:p-8"
        >
          Checking your payment…
        </div>
      </div>
    )
  if (!account || user?.role !== "customer") {
    const parsedOrder = GettyIdSchema.safeParse(order)
    const returnTo = parsedOrder.success
      ? `/checkout/callback?order=${encodeURIComponent(parsedOrder.data)}`
      : "/checkout/callback"
    return (
      <div className="site-container py-8 sm:py-12">
        <section className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Check your payment</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Sign in with the customer account used at checkout to verify your
            payment with Getty and see your order result.
          </p>
          <Link
            className="bg-primary mt-6 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold text-white"
            href={
              user
                ? reauthenticationHref(returnTo)
                : authHref("/login", returnTo)
            }
          >
            Sign in to view order
          </Link>
        </section>
      </div>
    )
  }
  return (
    <ReturnStatus
      key={account}
      account={account}
      order={order}
      autoContinue={autoContinue}
      returnPage={returnPage}
    />
  )
}
function ReturnStatus({
  account,
  order,
  autoContinue,
  returnPage,
}: {
  account: string
  order?: string
  autoContinue: boolean
  returnPage: boolean
}) {
  const [saved] = useState(() => readRecovery(account).order)
  const parsed = GettyIdSchema.safeParse(order ?? saved)
  return (
    <div className="site-container py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        {parsed.success ? (
          <PaymentPanel
            orderId={parsed.data}
            returnPage={returnPage}
            autoContinue={autoContinue}
          />
        ) : (
          <section className="rounded-2xl border bg-white p-6 sm:p-8">
            <h1 className="text-2xl font-semibold">Find your payment</h1>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              Open your order to check its payment status. A payment provider
              reference alone cannot confirm that your order was paid.
            </p>
            <Link
              className="text-primary mt-5 inline-flex min-h-11 items-center font-semibold"
              href="/customer/orders"
            >
              View your orders
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
