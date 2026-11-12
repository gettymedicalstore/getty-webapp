"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import ContentError from "@/components/shared/content-error"
import { OrdersSkeleton } from "@/components/shared/loading-skeletons"
import StatusBadge from "@/components/admin/shared/status-badge"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import {
  canAdvanceFulfilment,
  getFulfilmentOrder,
  operationsSupplyActions,
  type OperationsOrder,
} from "../api/fulfilment"
import { formatOrderAmount } from "../utils/format-order-amount"
import FulfilmentActionDialog, {
  type WorkflowSelection,
} from "./fulfilment-action-dialog"

const nextLabels = {
  preparing: "Start preparing",
  ready: "Confirm packed and ready",
  dispatch: "Dispatch order",
  deliver: "Record delivery",
} as const
const custodyLabels = {
  receive: "Confirm receipt",
  "return-to-vendor": "Return to supplier",
} as const

export default function OperationsOrderDetail({
  orderId,
  view = "fulfilment",
}: {
  orderId: string
  view?: "orders" | "fulfilment"
}) {
  const { data: session } = useAuthSession()
  const client = useQueryClient()
  const [selection, setSelection] = useState<WorkflowSelection | null>(null)
  const key = ["fulfilment-order", session?.user?.id, orderId]
  const query = useQuery({
    queryKey: key,
    queryFn: () => getFulfilmentOrder(orderId),
    enabled: Boolean(session?.user),
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 15_000
        : false,
  })
  const refresh = async () => {
    await Promise.all([
      query.refetch(),
      client.invalidateQueries({ queryKey: ["fulfilment-orders"] }),
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
  const order = query.data
  const canManage = view === "fulfilment"
  const next = canAdvanceFulfilment(order)
  const active = order.items.filter(
    (item) => item.status !== "cancelled" && item.supply.status !== "cancelled"
  )
  const received = active.filter(
    (item) => item.supply.status === "received"
  ).length
  const sellerNumbers = new Map<string, number>()
  for (const item of order.items)
    if (item.seller && !sellerNumbers.has(item.seller))
      sellerNumbers.set(item.seller, sellerNumbers.size + 1)
  return (
    <div className="min-w-0 space-y-5">
      <Link
        href={canManage ? "/admin/fulfilment" : "/admin/orders"}
        className="text-primary inline-flex min-h-10 items-center text-sm font-medium"
      >
        ← Back to {canManage ? "order fulfilment" : "orders"}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs">Order reference</p>
          <h1 className="mt-1 text-xl font-semibold break-all">
            {order.orderCode ?? order.reference ?? order.id}
          </h1>
          {order.placed && (
            <p className="text-muted-foreground mt-1 text-sm">
              Placed{" "}
              {new Date(order.placed).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.status && <StatusBadge status={order.status} />}
          <StatusBadge status={order.fulfilment} />
          {!canManage && (
            <Link
              href={`/admin/fulfilment/${encodeURIComponent(order.id)}`}
              className="bg-primary inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-white"
            >
              Update order status
            </Link>
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Getty delivery</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {received} of {active.length} active items received at Getty.
                </p>
              </div>
              {canManage && next && (
                <Button
                  onClick={() =>
                    setSelection({ action: next, version: order.version })
                  }
                >
                  {nextLabels[next]}
                </Button>
              )}
            </div>
            <ol
              className="mt-5 grid gap-2 sm:grid-cols-5"
              aria-label="Delivery stages"
            >
              {(
                [
                  "placed",
                  "preparing",
                  "ready",
                  "dispatched",
                  "delivered",
                ] as const
              ).map((stage, index) => (
                <li
                  key={stage}
                  className={`rounded-lg border px-3 py-2 text-sm capitalize ${["placed", "preparing", "ready", "dispatched", "delivered"].indexOf(order.fulfilment) >= index ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "text-muted-foreground"}`}
                >
                  {stage}
                </li>
              ))}
            </ol>
            {order.tracking &&
              (order.tracking.carrier || order.tracking.reference) && (
                <p className="mt-4 text-sm">
                  {order.tracking.carrier} · {order.tracking.reference}
                </p>
              )}
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">
              {canManage ? "Supplier handovers" : "Order items"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {canManage
                ? "Confirm physical receipt before marking the order ready."
                : "Supplier custody and handover status for this order."}
            </p>
            <div className="mt-4 space-y-5">
              {[...sellerNumbers.entries()].map(([seller, number]) => (
                <div key={seller}>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f5f9f6] px-3 py-2 text-sm font-semibold">
                    <h3>Supplier {number}</h3>
                    <Link
                      href={`/admin/vendors/${encodeURIComponent(seller)}`}
                      className="text-primary text-xs font-medium"
                    >
                      View supplier
                    </Link>
                  </div>
                  <div className="divide-y">
                    {order.items
                      .filter((item) => item.seller === seller)
                      .map((item) => (
                        <article
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-4 py-4"
                        >
                          <div className="min-w-0">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-muted-foreground mt-1 text-sm">
                              Quantity {item.quantity}
                              {item.pack && item.unit
                                ? ` · ${item.pack} ${item.unit}${item.pack === 1 ? "" : "s"} per pack`
                                : item.unit
                                  ? ` · ${item.unit}`
                                  : ""}
                            </p>
                            {item.options &&
                              Object.entries(item.options).some(
                                ([, value]) => value != null && value !== ""
                              ) && (
                                <p className="text-muted-foreground mt-1 text-sm">
                                  {Object.entries(item.options)
                                    .filter(
                                      ([, value]) =>
                                        value != null && value !== ""
                                    )
                                    .map(
                                      ([name, value]) =>
                                        `${name}: ${String(value)}`
                                    )
                                    .join(" · ")}
                                </p>
                              )}
                            <p className="text-muted-foreground mt-1 text-sm">
                              Custody:{" "}
                              <span className="font-medium capitalize">
                                {item.supply.status}
                              </span>
                              {item.supply.reference
                                ? ` · ${item.supply.reference}`
                                : ""}
                            </p>
                            {item.price != null && (
                              <p className="mt-2 text-sm">
                                Unit price:{" "}
                                {formatOrderAmount(
                                  item.price,
                                  order.currency ?? "NGN"
                                )}
                              </p>
                            )}
                            {item.discount != null && item.discount > 0 && (
                              <p className="text-primary mt-1 text-sm">
                                Discount:{" "}
                                {formatOrderAmount(
                                  item.discount,
                                  order.currency ?? "NGN"
                                )}
                              </p>
                            )}
                          </div>
                          {item.total != null && (
                            <p className="font-semibold tabular-nums">
                              {formatOrderAmount(
                                item.total,
                                order.currency ?? "NGN"
                              )}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {(canManage
                              ? operationsSupplyActions(order, item)
                              : []
                            ).map((action) => (
                              <Button
                                key={action}
                                variant="outline"
                                onClick={() =>
                                  setSelection({
                                    action,
                                    itemId: item.id,
                                    itemName: item.name,
                                    version: item.version,
                                  })
                                }
                              >
                                {custodyLabels[action]}
                              </Button>
                            ))}
                          </div>
                        </article>
                      ))}
                  </div>
                </div>
              ))}
              {order.items.some((item) => !item.seller) && (
                <div>
                  <h3 className="rounded-lg bg-[#f5f9f6] px-3 py-2 text-sm font-semibold">
                    Other items
                  </h3>
                  {order.items
                    .filter((item) => !item.seller)
                    .map((item) => (
                      <p key={item.id} className="px-3 py-3 text-sm">
                        {item.name} · {item.supply.status}
                      </p>
                    ))}
                </div>
              )}
            </div>
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Order history</h2>
            {!order.history?.length ? (
              <p className="text-muted-foreground mt-3 text-sm">
                No events recorded yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4 border-l pl-5">
                {[...order.history]
                  .sort((a, b) => Date.parse(b.entry) - Date.parse(a.entry))
                  .map((event) => (
                    <li key={event.id}>
                      <p className="font-medium capitalize">
                        {event.action.replaceAll("-", " ")}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {new Date(event.entry).toLocaleString("en-NG", {
                          timeZone: "Africa/Lagos",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {event.actor
                          ? ` · ${typeof event.actor === "string" ? event.actor : (event.actor.name ?? "Staff")}`
                          : ""}
                      </p>
                      {(event.before || event.after) && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {event.before ?? "—"} → {event.after ?? "—"}
                        </p>
                      )}
                      {event.reason && (
                        <p className="mt-1 text-sm">{event.reason}</p>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </section>
        </div>
        <aside className="min-w-0 space-y-4">
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Delivery destination</h2>
            {order.delivery ? (
              <address className="mt-3 space-y-1 text-sm not-italic">
                <p className="font-medium">{order.delivery.name}</p>
                <p>{order.delivery.phone}</p>
                <p>{order.delivery.address}</p>
                <p>
                  {[
                    order.delivery.city,
                    order.delivery.state,
                    order.delivery.postcode,
                    order.delivery.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </address>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                No delivery contact returned.
              </p>
            )}
          </section>
          {order.notes && (
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Delivery note</h2>
              <p className="text-muted-foreground mt-3 text-sm whitespace-pre-wrap">
                {order.notes}
              </p>
            </section>
          )}
          {order.total != null && (
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Order summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {(
                  [
                    ["Subtotal", order.subtotal],
                    ["Discount", order.discount],
                    ["Tax included", order.tax],
                    ["Shipping", order.shipping],
                  ] as const
                ).map(([label, value]) =>
                  value == null ? null : (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">
                        {formatOrderAmount(value, order.currency ?? "NGN")}
                      </dd>
                    </div>
                  )
                )}
                <div className="flex justify-between gap-3 border-t pt-3 font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {formatOrderAmount(order.total, order.currency ?? "NGN")}
                  </dd>
                </div>
              </dl>
            </section>
          )}
          {order.payments && order.payments.length > 0 && (
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Payments</h2>
              <ul className="mt-3 divide-y text-sm">
                {order.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium capitalize">{payment.kind}</p>
                      <StatusBadge status={payment.status} />
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatOrderAmount(payment.amount, payment.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      {canManage && selection && (
        <FulfilmentActionDialog
          orderId={order.id}
          selection={selection}
          audience="operations"
          onClose={() => setSelection(null)}
          onSuccess={(result) => {
            client.setQueryData(key, result as OperationsOrder)
            void client.invalidateQueries({ queryKey: ["fulfilment-orders"] })
          }}
          onRefresh={refresh}
        />
      )}
    </div>
  )
}
