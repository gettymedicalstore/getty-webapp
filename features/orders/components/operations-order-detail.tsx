"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowUpRight, Check, MapPin, Truck } from "lucide-react"
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
import ParcelPhoto from "./parcel-photo"

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
const stages = [
  { key: "placed", label: "Order placed", detail: "Order received by Getty" },
  {
    key: "preparing",
    label: "Preparing",
    detail: "Suppliers hand over the items",
  },
  {
    key: "ready",
    label: "Ready for delivery",
    detail: "Items packed and checked",
  },
  {
    key: "dispatched",
    label: "Dispatched",
    detail: "On the way to the customer",
  },
  {
    key: "delivered",
    label: "Delivered",
    detail: "Handed over at the destination",
  },
] as const
const eventLabels: Record<string, string> = {
  placed: "Order placed",
  "payment-started": "Payment started",
  "charge-succeeded": "Payment received",
  "charge-failed": "Payment failed",
  "fulfilment-preparing": "Preparation started",
  "fulfilment-ready": "Order ready",
  "fulfilment-dispatched": "Order dispatched",
  "fulfilment-delivered": "Order delivered",
  "supply-received": "Supplier items received",
}
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      })
}
function actorName(
  actor: string | { name?: string; id?: string } | null | undefined
) {
  if (!actor) return null
  if (typeof actor === "string")
    return /^[\da-f]{8}-[\da-f-]{27,}$/i.test(actor) ? "Getty team" : actor
  return actor.name || "Getty team"
}

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
  const awaitingReceipt = active.filter(
    (item) => item.supply.status === "supplied"
  ).length
  const awaitingSupplier = active.filter(
    (item) =>
      item.supply.status === "pending" || item.supply.status === "accepted"
  ).length
  const currentStage = stages.findIndex(
    (stage) => stage.key === order.fulfilment
  )
  const sellerNumbers = new Map<string, number>()
  for (const item of order.items)
    if (item.seller && !sellerNumbers.has(item.seller))
      sellerNumbers.set(item.seller, sellerNumbers.size + 1)
  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-6 pb-10">
      <Link
        href={canManage ? "/admin/fulfilment" : "/admin/orders"}
        className="text-primary inline-flex min-h-10 items-center gap-2 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to{" "}
        {canManage ? "order fulfilment" : "orders"}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            {canManage ? "Fulfilment order" : "Order details"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight break-all sm:text-3xl">
            {order.orderCode ?? order.reference ?? order.id}
          </h1>
          {order.placed && (
            <p className="text-muted-foreground mt-2 text-sm">
              Placed {formatDate(order.placed)} · Africa/Lagos
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {order.status && (
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">Order</span>
                <StatusBadge status={order.status} />
              </span>
            )}
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Delivery</span>
              <StatusBadge status={order.fulfilment} />
            </span>
          </div>
        </div>
        {canManage && next ? (
          <Button
            onClick={() =>
              setSelection({ action: next, version: order.version })
            }
          >
            {nextLabels[next]}
          </Button>
        ) : !canManage ? (
          <Link
            href={`/admin/fulfilment/${encodeURIComponent(order.id)}`}
            className="bg-primary inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            Update order status <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </header>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,21rem)]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold">Getty delivery</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Follow the order from placement to delivery.
                </p>
              </div>
              {currentStage >= 0 && (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  Stage {currentStage + 1} of {stages.length}
                </span>
              )}
            </div>
            <div className="grid gap-7 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)]">
              <ol className="space-y-0" aria-label="Delivery stages">
                {stages.map((stage, index) => {
                  const complete = currentStage > index
                  const current = currentStage === index
                  return (
                    <li
                      key={stage.key}
                      className="relative flex gap-4 pb-7 last:pb-0"
                    >
                      {index < stages.length - 1 && (
                        <span
                          aria-hidden
                          className={`absolute top-9 bottom-0 left-[17px] w-px ${complete ? "bg-emerald-500" : "bg-slate-200"}`}
                        />
                      )}
                      <span
                        aria-current={current ? "step" : undefined}
                        className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${current ? "border-emerald-700 bg-emerald-700 text-white ring-4 ring-emerald-100" : complete ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-500"}`}
                      >
                        {complete ? (
                          <Check className="size-4" aria-hidden />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p
                          className={`font-semibold ${current ? "text-emerald-800" : "text-slate-800"}`}
                        >
                          {stage.label}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {stage.detail}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <div className="space-y-3 md:border-l md:pl-6">
                <div className="rounded-xl bg-[#f3f8f4] p-4">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Current stage
                  </p>
                  <p className="mt-2 text-lg font-semibold text-emerald-950">
                    {stages[currentStage]?.label ?? order.fulfilment}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {received} of {active.length} active{" "}
                    {active.length === 1 ? "item" : "items"} received at Getty
                  </p>
                </div>
                {canManage &&
                  order.fulfilment === "preparing" &&
                  received < active.length && (
                    <div className="space-y-2 text-sm leading-6">
                      <p className="text-muted-foreground">
                        Getty requires every active item to be received before
                        the order can be marked ready. The parcel photo is
                        optional.
                      </p>
                      {awaitingReceipt > 0 && (
                        <p className="text-muted-foreground">
                          {awaitingReceipt}{" "}
                          {awaitingReceipt === 1 ? "item is" : "items are"}{" "}
                          available to confirm as received.
                        </p>
                      )}
                      {awaitingSupplier > 0 && (
                        <p className="text-muted-foreground">
                          {awaitingSupplier}{" "}
                          {awaitingSupplier === 1 ? "item is" : "items are"}{" "}
                          awaiting supplier handover.
                        </p>
                      )}
                      <a
                        href="#supplier-handovers"
                        className="text-primary inline-flex min-h-9 items-center gap-1 font-semibold hover:underline"
                      >
                        View supplier handovers{" "}
                        <ArrowUpRight className="size-4" aria-hidden />
                      </a>
                    </div>
                  )}
                {canManage &&
                  (order.fulfilment === "preparing" ||
                    order.fulfilment === "ready") &&
                  !order.parcelPhoto && (
                    <p className="text-muted-foreground text-sm leading-6">
                      You can add a package photo when marking the order ready
                      or dispatching it.
                    </p>
                  )}
                {order.tracking &&
                  (order.tracking.carrier || order.tracking.reference) && (
                    <div className="rounded-xl border p-4 text-sm">
                      <p className="flex items-center gap-2 font-semibold">
                        <Truck className="text-primary size-4" aria-hidden />{" "}
                        Tracking
                      </p>
                      {order.tracking.carrier && (
                        <p className="mt-2">{order.tracking.carrier}</p>
                      )}
                      {order.tracking.reference && (
                        <p className="text-muted-foreground mt-1 break-all">
                          {order.tracking.reference}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </section>
          <section
            id="supplier-handovers"
            className="scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-end justify-between gap-2 border-b px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold">
                  {canManage ? "Supplier handovers" : "Order items"}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {canManage
                    ? "Confirm physical receipt of each item."
                    : "Items and supplier custody for this order."}
                </p>
              </div>
              <span className="text-muted-foreground text-sm">
                {received}/{active.length} received
              </span>
            </div>
            <div className="divide-y px-5 sm:px-6">
              {[...sellerNumbers.entries()].map(([seller, number]) => (
                <div key={seller} className="py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                    <h3 className="tracking-wide text-slate-700">
                      Supplier {number}
                    </h3>
                    <Link
                      href={`/admin/vendors/${encodeURIComponent(seller)}`}
                      className="text-primary inline-flex min-h-8 items-center gap-1 text-sm font-medium hover:underline"
                    >
                      View supplier{" "}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {order.items
                      .filter((item) => item.seller === seller)
                      .map((item) => (
                        <article
                          key={item.id}
                          className="flex flex-wrap items-start justify-between gap-4 py-4 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-900">
                              {item.name}
                            </h4>
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
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`rounded-full px-2.5 py-1 font-semibold capitalize ${item.supply.status === "received" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                              >
                                {item.supply.status === "received"
                                  ? "Received at Getty"
                                  : item.supply.status}
                              </span>
                              {item.supply.reference && (
                                <span className="text-muted-foreground break-all">
                                  Ref: {item.supply.reference}
                                </span>
                              )}
                            </div>
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
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            {item.total != null && (
                              <p className="font-semibold tabular-nums">
                                {formatOrderAmount(
                                  item.total,
                                  order.currency ?? "NGN"
                                )}
                              </p>
                            )}
                            {(canManage
                              ? operationsSupplyActions(order, item)
                              : []
                            ).map((action) => (
                              <Button
                                key={action}
                                variant="outline"
                                size="sm"
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
                  <h3 className="py-3 text-sm font-semibold text-slate-700">
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
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">Activity</h2>
            {!order.history?.length ? (
              <p className="text-muted-foreground mt-3 text-sm">
                No events recorded yet.
              </p>
            ) : (
              <ol className="mt-5 space-y-0">
                {[...order.history]
                  .sort((a, b) => Date.parse(b.entry) - Date.parse(a.entry))
                  .map((event, index, events) => (
                    <li
                      key={event.id}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      {index < events.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute top-4 bottom-0 left-[5px] w-px bg-slate-200"
                        />
                      )}
                      <span
                        aria-hidden
                        className={`relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full ${index === 0 ? "bg-emerald-600 ring-4 ring-emerald-100" : "border-2 border-slate-300 bg-white"}`}
                      />
                      <div className="min-w-0 flex-1 sm:flex sm:justify-between sm:gap-4">
                        <div>
                          <p className="font-medium capitalize">
                            {eventLabels[event.action] ??
                              event.action.replaceAll("-", " ")}
                          </p>
                          {(event.before || event.after) && (
                            <p className="text-muted-foreground mt-1 text-sm capitalize">
                              {event.before ?? "—"} → {event.after ?? "—"}
                            </p>
                          )}
                          {event.reason && (
                            <p className="mt-1 text-sm">{event.reason}</p>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 shrink-0 text-xs sm:mt-0 sm:text-right">
                          {formatDate(event.entry)}
                          {actorName(event.actor)
                            ? ` · ${actorName(event.actor)}`
                            : ""}
                        </p>
                      </div>
                    </li>
                  ))}
              </ol>
            )}
          </section>
        </div>
        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="text-primary size-4" aria-hidden /> Delivery
              destination
            </h2>
            {order.delivery ? (
              <address className="mt-4 space-y-1 text-sm leading-6 not-italic">
                <p className="font-semibold">{order.delivery.name}</p>
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
                {order.delivery.phone && (
                  <a
                    className="text-primary inline-block pt-1 hover:underline"
                    href={`tel:${order.delivery.phone}`}
                  >
                    {order.delivery.phone}
                  </a>
                )}
              </address>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                No delivery contact returned.
              </p>
            )}
            {order.notes && (
              <div className="mt-4 border-t pt-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Delivery note
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap">
                  {order.notes}
                </p>
              </div>
            )}
          </section>
          {order.total != null && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
                <div className="flex justify-between gap-3 border-t pt-4 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {formatOrderAmount(order.total, order.currency ?? "NGN")}
                  </dd>
                </div>
              </dl>
            </section>
          )}
          {order.parcelPhoto && (
            <ParcelPhoto orderId={order.id} photo={order.parcelPhoto} />
          )}
          {order.payments && order.payments.length > 0 && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
