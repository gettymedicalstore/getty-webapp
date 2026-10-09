"use client"
import { OrdersSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import { useQuery } from "@tanstack/react-query"
import { Package, RotateCcw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import OrderDashboardSummary from "@/features/orders/components/order-dashboard-summary"
import { useState } from "react"
import CustomerOrderCard from "@/components/customer/orders/customer-order-card"
import PageHeading from "@/components/shared/page-heading"
import EmptyState from "@/components/shared/empty-state"
import { unavailable } from "@/lib/api/client"
import type { CheckoutOrder } from "@/features/orders/types/order"
export const customerOrdersOptions = {
  queryKey: ["customer", "orders"] as const,
  queryFn: async (): Promise<{ orders: CheckoutOrder[] }> =>
    unavailable("Your order history is temporarily unavailable."),
  staleTime: 0,
}
export default function CustomerOrders({
  payments = false,
  embedded = false,
}: {
  payments?: boolean
  embedded?: boolean
}) {
  const query = useQuery(customerOrdersOptions)
  const [status, setStatus] = useState("all")
  const orders = (query.data?.orders ?? []).filter(
    (o) => status === "all" || o.paymentStatus === status
  )
  return (
    <div className="space-y-7">
      {embedded ? (
        <h2 className="text-xl font-semibold tracking-tight">Recent orders</h2>
      ) : (
        <PageHeading
          title={payments ? "Payments" : "My orders"}
          action={
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RotateCcw aria-hidden className="size-4" />
              Refresh
            </Button>
          }
          description={
            payments
              ? "Review payments and outstanding balances."
              : "Your order overview, payment progress and recent purchases."
          }
        />
      )}
      {!payments && !embedded && (
        <OrderDashboardSummary
          workspace="customer"
          loading={query.isPending}
          orders={query.isSuccess ? query.data.orders : undefined}
        />
      )}
      {!embedded && (
        <div>
          <h2 className="text-lg font-semibold text-[#2b4032]">
            {payments ? "Payment history" : "Order history"}
          </h2>
          <p className="mt-1 text-sm text-[#5e6f63]">
            Filter your orders by payment status.
          </p>
        </div>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter orders"
      >
        {["all", "pending", "partially-paid", "paid", "failed"].map((s) => (
          <button
            key={s}
            type="button"
            disabled={!query.isSuccess}
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`min-h-10 rounded-lg border px-4 text-sm capitalize disabled:opacity-50 ${status === s ? "border-primary bg-primary/10 text-primary" : "bg-white"}`}
          >
            {s.replaceAll("-", " ")}
          </button>
        ))}
      </div>
      {query.isPending ? (
        <OrdersSkeleton />
      ) : query.isError ? (
        <ContentError
          title={
            payments
              ? "Your payments are temporarily unavailable"
              : "Your orders are temporarily unavailable"
          }
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : orders.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
            <CustomerOrderCard
              key={order.id}
              order={{
                id: order.id,
                number: order.reference,
                placedAt: new Date(order.createdAt).toLocaleDateString("en-NG"),
                status: order.paymentStatus,
                total: payments ? order.paidAmountKobo / 100 : order.total,
                itemCount: order.items.reduce((a, b) => a + b.quantity, 0),
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={status === "all" ? "No orders yet" : "No matching orders"}
          description="Your orders and payment updates will appear here after checkout."
          icon={Package}
          action={
            <Link
              href="/products"
              className="bg-primary inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold text-white"
            >
              Browse products
            </Link>
          }
        />
      )}
    </div>
  )
}
