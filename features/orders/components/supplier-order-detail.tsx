"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import ContentError from "@/components/shared/content-error"
import { OrdersSkeleton } from "@/components/shared/loading-skeletons"
import StatusBadge from "@/components/admin/shared/status-badge"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { supplierActionFor } from "../api/fulfilment"
import {
  availableLineActions,
  getOrder,
  type ManagedOrder,
  type OrderAction,
  type OrderLine,
} from "../api/order-management"
import { formatOrderAmount } from "../utils/format-order-amount"
import FulfilmentActionDialog, {
  type WorkflowSelection,
} from "./fulfilment-action-dialog"
import { ActionDialog } from "./order-detail"

const legacyLabels: Record<OrderAction, string> = {
  cancel: "Cancel item",
  "request-return": "Request return",
  "approve-return": "Approve return",
  "reject-return": "Reject return",
  "receive-return": "Receive return",
}

export default function SupplierOrderDetail({ orderId }: { orderId: string }) {
  const { data: session } = useAuthSession()
  const client = useQueryClient()
  const key = ["order", session?.user?.id, "vendor", orderId]
  const [selection, setSelection] = useState<WorkflowSelection | null>(null)
  const [legacySelection, setLegacySelection] = useState<{
    action: OrderAction
    line: OrderLine
  } | null>(null)
  const query = useQuery({
    queryKey: key,
    queryFn: () => getOrder("vendor", orderId),
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
  const order = query.data
  return (
    <div className="min-w-0 space-y-5">
      <Link
        href="/supplier/orders"
        className="text-primary inline-flex min-h-10 items-center text-sm font-medium"
      >
        ← Back to orders
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs">Order reference</p>
          <h1 className="mt-1 text-xl font-semibold break-all">
            {order.orderCode ?? order.reference}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Placed{" "}
            {new Date(order.placed).toLocaleString("en-NG", {
              timeZone: "Africa/Lagos",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} />
          {order.fulfilment && <StatusBadge status={order.fulfilment} />}
        </div>
      </div>
      <section className="rounded-xl border bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Your items</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Getty coordinates delivery to the buyer. Record each physical handover
          with its reference.
        </p>
        <div className="mt-4 divide-y">
          {order.items.map((item) => {
            const action = supplierActionFor(order, item)
            const legacyActions = availableLineActions("vendor", order, item)
            return (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Quantity {item.quantity} ·{" "}
                    {formatOrderAmount(item.total, order.currency)}
                  </p>
                  <p className="mt-2 text-sm">
                    Supply:{" "}
                    <span className="font-medium capitalize">
                      {item.supply?.status ?? "Awaiting Getty preparation"}
                    </span>
                    {item.supply?.reference
                      ? ` · Reference ${item.supply.reference}`
                      : ""}
                  </p>
                </div>
                {(action || legacyActions.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {action && (
                      <Button
                        onClick={() =>
                          setSelection({
                            action,
                            itemId: item.id,
                            itemName: item.name,
                            version: item.version,
                          })
                        }
                      >
                        {action === "accept"
                          ? "Accept supply request"
                          : "Record physical handover"}
                      </Button>
                    )}
                    {legacyActions.map((legacyAction) => (
                      <Button
                        key={legacyAction}
                        variant="outline"
                        onClick={() =>
                          setLegacySelection({
                            action: legacyAction,
                            line: item,
                          })
                        }
                      >
                        {legacyLabels[legacyAction]}
                      </Button>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
      {order.supplyProgress && (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Supply progress</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(["pending", "accepted", "supplied", "received"] as const).map(
              (status) => (
                <div key={status} className="rounded-lg bg-[#f6faf7] p-3">
                  <dt className="text-muted-foreground capitalize">{status}</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {order.supplyProgress?.[status] ?? 0}
                  </dd>
                </div>
              )
            )}
          </dl>
        </section>
      )}
      {selection && (
        <FulfilmentActionDialog
          orderId={order.id}
          selection={selection}
          audience="vendor"
          onClose={() => setSelection(null)}
          onSuccess={(result) => {
            client.setQueryData(key, result as ManagedOrder)
            void client.invalidateQueries({ queryKey: ["orders"] })
          }}
          onRefresh={refresh}
        />
      )}
      {legacySelection && (
        <ActionDialog
          order={order}
          selection={legacySelection}
          workspace="supplier"
          onClose={() => setLegacySelection(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  )
}
