"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock3, Package, Wallet } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
} from "@/components/shared/form/validated-form"
import ContentError from "@/components/shared/content-error"
import AdminDataTable from "@/components/admin/tables/admin-data-table"
import CustomerMetricCard from "@/components/customer/dashboard/customer-metric-card"
import StatusBadge from "@/components/admin/shared/status-badge"
import { cn } from "@/lib/utils"
import { formatOrderAmount as formatCurrency } from "../utils/format-order-amount"
import {
  dateFiltersSchema,
  defaultOrderFilters,
  getOrders,
  orderStatuses,
  itemStatuses,
  type OrderDateFilters,
  type OrderSummary,
} from "../api/order-management"

export function OrderFilters({
  value,
  onChange,
  vendor = false,
  datesOnly = false,
  inTable = false,
}: {
  value: OrderDateFilters
  onChange: (value: OrderDateFilters) => void
  vendor?: boolean
  datesOnly?: boolean
  inTable?: boolean
}) {
  return (
    <ValidatedForm
      schema={dateFiltersSchema}
      defaultValues={value}
      onSubmit={onChange}
      aria-label="Filter orders"
      className={cn(
        "grid grid-cols-1 items-start gap-4 bg-white p-4 sm:grid-cols-2 sm:p-5",
        !inTable && "rounded-xl border",
        datesOnly
          ? "xl:grid-cols-[repeat(2,minmax(0,1fr))_auto]"
          : vendor
            ? "xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
            : "xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
      )}
    >
      <FormInputField
        name="from"
        type="date"
        label="From"
        id="orders-from"
        inputClassName="h-11"
        containerClassName="min-w-0"
      />
      <FormInputField
        name="through"
        type="date"
        label="Through"
        id="orders-through"
        inputClassName="h-11"
        containerClassName="min-w-0"
      />
      {!datesOnly && (
        <div className="min-w-0">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="orders-status"
          >
            Order status
          </label>
          <FormSelect
            id="orders-status"
            name="status"
            className="form-input h-11"
          >
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
        <div className="min-w-0">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="orders-item-status"
          >
            Item status
          </label>
          <FormSelect
            id="orders-item-status"
            name="itemStatus"
            className="form-input h-11"
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
      <Button
        type="submit"
        variant="outline"
        className="h-11 self-start sm:mt-7"
      >
        Apply filters
      </Button>
      <p className="text-muted-foreground col-span-full text-xs leading-5">
        Dates shown in Africa/Lagos. The end date includes the whole day.
      </p>
    </ValidatedForm>
  )
}
export default function OrdersPage({
  workspace,
  embedded = false,
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
  const columns: ColumnDef<OrderSummary, unknown>[] = [
    {
      accessorKey: "reference",
      header: "Order reference",
      enableSorting: false,
      cell: ({ row: { original: order } }) => (
        <span className="block max-w-72 min-w-48 leading-6 font-medium break-all text-[#293c30]">
          {order.reference}
        </span>
      ),
    },
    {
      accessorKey: "placed",
      header: "Placed",
      enableSorting: false,
      cell: ({ row: { original: order } }) => (
        <time dateTime={order.placed} className="block whitespace-nowrap">
          <span className="block text-[#293c30]">
            {new Date(order.placed).toLocaleDateString("en-NG", {
              timeZone: "Africa/Lagos",
              dateStyle: "medium",
            })}
          </span>
          <span className="text-muted-foreground mt-1 block text-xs">
            {new Date(order.placed).toLocaleTimeString("en-NG", {
              timeZone: "Africa/Lagos",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </time>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "total",
      header: () => (
        <span className="block w-28 text-right">
          {audience === "vendor" ? "Your items’ total" : "Order total"}
        </span>
      ),
      enableSorting: false,
      cell: ({ row: { original: order } }) => (
        <span className="block w-28 text-right font-semibold whitespace-nowrap text-[#293c30] tabular-nums">
          {formatCurrency(order.total, order.currency)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row: { original: order } }) => (
        <Link
          href={`/${workspace}/orders/${encodeURIComponent(order.id)}`}
          className="text-primary inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold whitespace-nowrap hover:bg-[#edf6f0]"
          aria-label={`View order ${order.reference}`}
        >
          View order
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ),
    },
  ]
  return (
    <div className="min-w-0 space-y-6">
      {embedded && <h2 className="text-xl font-semibold">Recent orders</h2>}
      {!embedded && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <CustomerMetricCard
              compact
              title="Matching orders"
              value={query.isSuccess ? query.data.records : "—"}
              description="Across the selected dates and filters"
              loading={query.isPending}
              icon={Package}
            />
            <CustomerMetricCard
              compact
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
              compact
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
              compact
              valueClassName="text-base min-[375px]:text-lg sm:text-2xl"
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
          {workspace === "admin" && (
            <div className="flex justify-end">
              <Link
                href="/admin/payments"
                className="inline-flex min-h-11 items-center rounded-lg border bg-white px-4 text-sm font-medium"
              >
                Payment recovery
              </Link>
            </div>
          )}
        </>
      )}
      {query.isError && (
        <ContentError
          title="We couldn’t load your orders"
          description={query.error.message}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      )}
      <section aria-label="Orders" aria-busy={query.isFetching}>
        <AdminDataTable
          label="Orders"
          columns={columns}
          data={rows}
          loading={query.isPending}
          total={query.data?.records ?? 0}
          pageCount={1}
          pagination={{ pageIndex: 0, pageSize: 5 }}
          onPaginationChange={() => {}}
          toolbar={
            !embedded && (
              <OrderFilters
                inTable
                value={filters}
                vendor={audience === "vendor"}
                onChange={(value) => {
                  setFilters(value)
                  setPagination({ cursor: 0, navigation: "next" })
                }}
              />
            )
          }
          emptyState={
            query.isError ? (
              "Orders will appear here when the connection is restored."
            ) : (
              <div className="mx-auto max-w-sm space-y-2">
                <Package className="mx-auto mb-4 size-6" aria-hidden />
                <p className="font-semibold text-[#293c30]">
                  No orders in this date range
                </p>
                <p className="text-sm leading-6">
                  Try a different date range or status. New orders will appear
                  here after checkout.
                </p>
                {audience === "customer" && (
                  <Link
                    href="/products"
                    className="text-primary inline-flex min-h-11 items-center font-semibold"
                  >
                    Browse products →
                  </Link>
                )}
              </div>
            )
          }
          paginationControls={
            query.isSuccess ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs sm:px-5">
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
            ) : (
              <span className="sr-only" role="status">
                {query.isPending ? "Loading orders" : "Orders unavailable"}
              </span>
            )
          }
        />
      </section>
    </div>
  )
}
