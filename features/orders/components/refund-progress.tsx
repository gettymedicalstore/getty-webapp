"use client"

import { useQueries } from "@tanstack/react-query"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { getPayment } from "@/features/checkout/api/checkout"
import { Button } from "@/components/ui/button"
import { formatOrderAmount } from "../utils/format-order-amount"
import type { ManagedOrder } from "../api/order-management"
import {
  refundStatusLabel,
  summarizeRefundProgress,
} from "../api/refund-progress"

export default function RefundProgress({
  order,
  onRefresh,
}: {
  order: ManagedOrder
  onRefresh: () => Promise<unknown>
}) {
  const accountId = useAuthSession().data?.user?.id
  const refunds = (order.payments ?? []).filter(
    (payment) => payment.kind === "refund"
  )
  const queries = useQueries({
    queries: refunds.map((payment) => ({
      queryKey: ["order-refund", accountId, order.id, payment.id],
      queryFn: () => getPayment(order.id, payment.id),
      enabled: Boolean(accountId),
      retry: false,
      refetchInterval: (query: { state: { data?: { status: string } } }) =>
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        ["created", "pending", "unknown"].includes(
          query.state.data?.status ?? payment.status
        )
          ? 15_000
          : false,
    })),
  })
  const latest = (order.payments ?? []).map((payment) => {
    const index = refunds.findIndex((refund) => refund.id === payment.id)
    return index < 0 ? payment : (queries[index]?.data ?? payment)
  })
  const summary = summarizeRefundProgress(order.status, latest)
  if (!summary) return null
  const checking = queries.some((query) => query.isFetching)

  return (
    <section
      aria-label="Refund progress"
      className="mt-5 rounded-xl border border-[#d9e8dc] bg-[#f5faf6] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#254b35]">{summary}</h3>
          {summary === "Payment confirmation pending" && (
            <p className="text-muted-foreground mt-1 text-sm">
              Getty is still confirming the charge. Any applicable refund will
              appear here when it is recorded.
            </p>
          )}
          {summary === "Refund update pending" && (
            <p className="text-muted-foreground mt-1 text-sm">
              Your payment was received. Check again for the refund record.
            </p>
          )}
        </div>
        {summary !== "Full refund completed" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={checking}
            onClick={() => {
              void Promise.all([
                onRefresh(),
                ...queries.map((query) => query.refetch()),
              ])
            }}
          >
            {checking ? "Checking…" : "Check status"}
          </Button>
        )}
      </div>
      {refunds.length > 0 && (
        <ul className="mt-4 divide-y border-t text-sm">
          {refunds.map((refund, index) => {
            const detail = queries[index]?.data
            const current = detail ?? refund
            return (
              <li
                key={refund.id}
                className="flex flex-wrap justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-medium">
                    {refundStatusLabel(current.status)}
                  </p>
                  {current.settled && (
                    <time
                      dateTime={current.settled}
                      className="text-muted-foreground mt-1 block text-xs"
                    >
                      {new Date(current.settled).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  )}
                  {detail?.failure && (
                    <p className="text-muted-foreground mt-1 max-w-md text-xs break-words">
                      {detail.failure}
                    </p>
                  )}
                  {queries[index]?.isError && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Latest refund status unavailable. Try again.
                    </p>
                  )}
                </div>
                <span className="font-semibold tabular-nums">
                  {formatOrderAmount(current.amount, current.currency)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
