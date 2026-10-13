"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
  RotateCcw,
  Wallet,
} from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
} from "@/components/shared/form/validated-form"
import PageHeading from "@/components/shared/page-heading"
import EmptyState from "@/components/shared/empty-state"
import ContentError from "@/components/shared/content-error"
import { OrdersSkeleton } from "@/components/shared/loading-skeletons"
import CustomerMetricCard from "@/components/customer/dashboard/customer-metric-card"
import StatusBadge from "@/components/admin/shared/status-badge"
import { formatOrderAmount as formatCurrency } from "../utils/format-order-amount"
import {
  dateFiltersSchema,
  defaultOrderFilters,
  getOrders,
  orderStatuses,
  itemStatuses,
  type OrderDateFilters,
} from "../api/order-management"

export function OrderFilters({
  value,
  onChange,
  vendor = false,
  datesOnly = false,
}: {
  value: OrderDateFilters
  onChange: (value: OrderDateFilters) => void
  vendor?: boolean
  datesOnly?: boolean
}) {
  return (
    <ValidatedForm
      schema={dateFiltersSchema}
      defaultValues={value}
      onSubmit={onChange}
      className="grid items-start gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end"
    >
      <FormInputField name="from" type="date" label="From" id="orders-from" />
      <FormInputField
        name="through"
        type="date"
        label="Through"
        id="orders-through"
      />
      {!datesOnly && (
        <div className="min-w-40">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="orders-status"
          >
            Order status
          </label>
          <FormSelect id="orders-status" name="status" className="form-input">
            <option value="">All statuses</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ))}
          </FormSelect>
        </div>
      )}
      {vendor && !datesOnly && (
        <div className="min-w-40">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="orders-item-status"
          >
            Item status
          </label>
          <FormSelect
            id="orders-item-status"
            name="itemStatus"
            className="form-input"
          >
            <option value="">All items</option>
            {itemStatuses.map((status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ))}
          </FormSelect>
        </div>
      )}
      <Button type="submit" variant="outline" className="self-end">
        Apply filters
      </Button>
      <p className="text-muted-foreground basis-full text-xs sm:col-span-2">
        Dates shown in Africa/Lagos. The end date includes the whole day.
      </p>
    </ValidatedForm>
  )
}
export default function OrdersPage({
  workspace,
  embedded = false,
  payments = false,
}: {
  workspace: "customer" | "supplier" | "admin"
  embedded?: boolean
  payments?: boolean
}) {
  const { data: session } = useAuthSession()
  const [filters, setFilters] = useState(defaultOrderFilters)
  const [pagination, setPagination] = useState<{
    cursor: number
    navigation: "next" | "previous"
  }>({ cursor: 0, navigation: "next" })
  const audience = workspace === "customer" ? "customer" : "vendor"
  const query = useQuery({
    queryKey: ["orders", session?.user?.id, audience, filters, pagination],
    queryFn: () =>
      getOrders(audience, filters, pagination.cursor, pagination.navigation),
    enabled: Boolean(session?.user),
    staleTime: 15_000,
  })
  const rows = query.data?.items ?? []
  return (
    <div className="min-w-0 space-y-6">
      {embedded ? (
        <h2 className="text-xl font-semibold">Recent orders</h2>
      ) : (
        <PageHeading
          title={
            payments
              ? "Payments & orders"
              : workspace === "customer"
                ? "My orders"
                : "Orders"
          }
          description={
            audience === "customer"
              ? "Track your purchases, review payments and manage deliveries."
              : "Manage your organisation’s order items, fulfilment and returns."
          }
          action={
            <div className="flex flex-wrap gap-2">
              {workspace === "admin" && (
                <Link
                  href="/admin/payments"
                  className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 text-sm font-medium"
                >
                  Payment recovery
                </Link>
              )}
              <Button
                variant="outline"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                <RotateCcw className="size-4" aria-hidden />
                Refresh
              </Button>
            </div>
          }
        />
      )}
      {!embedded && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CustomerMetricCard
              title="Matching orders"
              value={query.isSuccess ? query.data.records : "—"}
              description="Across the selected dates and filters"
              loading={query.isPending}
              icon={Package}
            />
            <CustomerMetricCard
              title="In progress"
              value={
                query.isSuccess
                  ? rows.filter((order) =>
                      ["confirmed", "processing", "shipped"].includes(
                        order.status
                      )
                    ).length
                  : "—"
              }
              description="On this page"
              loading={query.isPending}
              icon={Clock3}
            />
            <CustomerMetricCard
              title="Completed"
              value={
                query.isSuccess
                  ? rows.filter((order) => order.status === "completed").length
                  : "—"
              }
              description="On this page"
              loading={query.isPending}
              icon={CheckCircle2}
            />
            <CustomerMetricCard
              title="Order value"
              value={
                query.isSuccess
                  ? formatCurrency(
                      rows.reduce((sum, order) => sum + order.total, 0)
                    )
                  : "—"
              }
              description={
                audience === "vendor"
                  ? "Your lines on this page; before refunds"
                  : "On this page; before refunds"
              }
              loading={query.isPending}
              icon={Wallet}
            />
          </div>
          <OrderFilters
            value={filters}
            vendor={audience === "vendor"}
            onChange={(value) => {
              setFilters(value)
              setPagination({ cursor: 0, navigation: "next" })
            }}
          />
        </>
      )}
      {query.isPending ? (
        <OrdersSkeleton />
      ) : query.isError ? (
        <ContentError
          title="We couldn’t load your orders"
          description={query.error.message}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No orders in this date range"
          description="Try a different date range or status. New orders will appear here after checkout."
          icon={Package}
          action={
            audience === "customer" ? (
              <Link href="/products" className="text-primary font-semibold">
                Browse products →
              </Link>
            ) : undefined
          }
        />
      ) : (
        <section aria-label="Orders" className="grid gap-4 lg:grid-cols-2">
          {rows.map((order) => (
            <article
              key={order.id}
              className="min-w-0 rounded-xl border bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold break-all">{order.reference}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {new Date(order.placed).toLocaleDateString("en-NG", {
                      timeZone: "Africa/Lagos",
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {audience === "vendor"
                      ? "Your items’ total"
                      : "Order total"}
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatCurrency(order.total, order.currency)}
                  </p>
                </div>
                <Link
                  href={`/${workspace}/orders/${encodeURIComponent(order.id)}`}
                  className="text-primary inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold"
                  aria-label={`View order ${order.reference}`}
                >
                  View order
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              {payments && (
                <p className="text-muted-foreground mt-4 text-sm">
                  Open the order to review confirmed payment attempts.
                </p>
              )}
            </article>
          ))}
        </section>
      )}
      {query.isSuccess && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            Showing {rows.length} of {query.data.records} matching orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={query.isFetching || !query.data.isPrevious}
              onClick={() =>
                setPagination({
                  cursor: query.data.previousCursor,
                  navigation: "previous",
                })
              }
            >
              Newer
            </Button>
            <Button
              variant="outline"
              disabled={query.isFetching || !query.data.isNext}
              onClick={() =>
                setPagination({
                  cursor: query.data.nextCursor,
                  navigation: "next",
                })
              }
            >
              Older
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
