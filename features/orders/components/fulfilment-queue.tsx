"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, RotateCw } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import {
  FormInputField,
  FormSelect,
  ValidatedForm,
} from "@/components/shared/form/validated-form"
import ContentError from "@/components/shared/content-error"
import StatusBadge from "@/components/admin/shared/status-badge"
import { GettyApiError } from "@/lib/api/errors"
import {
  defaultOrderFilters,
  fulfilmentStatuses,
} from "../api/order-management"
import {
  fulfilmentFiltersSchema,
  getFulfilmentQueue,
  type FulfilmentFilters,
} from "../api/fulfilment"
import { formatOrderAmount } from "../utils/format-order-amount"

function fulfilmentErrorDescription(error: Error) {
  if (!(error instanceof GettyApiError) || error.status !== 400)
    return error.message
  const detail = error.details
  if (typeof detail === "string" && detail.trim())
    return `${error.message}: ${detail}`
  if (
    detail &&
    typeof detail === "object" &&
    "message" in detail &&
    typeof detail.message === "string"
  )
    return `${error.message}: ${detail.message}`
  return "The fulfilment API rejected this date range or filter (HTTP 400). Try a shorter date range, then retry."
}

export default function FulfilmentQueue({
  view = "fulfilment",
}: {
  view?: "orders" | "fulfilment"
}) {
  const { data: session } = useAuthSession()
  const defaults = defaultOrderFilters()
  const [filters, setFilters] = useState<FulfilmentFilters>({
    from: defaults.from,
    through: defaults.through,
    fulfilment: "",
  })
  const [page, setPage] = useState(1)
  const [cursor, setCursor] = useState({
    value: 0,
    navigation: "next" as "next" | "previous",
  })
  const query = useQuery({
    queryKey: ["fulfilment-orders", session?.user?.id, filters, cursor],
    queryFn: () => getFulfilmentQueue(filters, cursor.value, cursor.navigation),
    enabled: Boolean(session?.user),
    refetchInterval: (activeQuery) =>
      activeQuery.state.status !== "error" &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
        ? 15_000
        : false,
    refetchIntervalInBackground: false,
  })
  function apply(next: FulfilmentFilters) {
    setFilters(next)
    setCursor({ value: 0, navigation: "next" })
    setPage(1)
  }
  const records = query.data?.items ?? []
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#243b2e]">
            {view === "orders" ? "Orders" : "Order fulfilment"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {view === "orders"
              ? "Review all orders and their current status."
              : "Coordinate supplier handover, Getty packing and delivery."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RotateCw className="mr-2 size-4" aria-hidden />
          Refresh
        </Button>
      </div>
      {view === "fulfilment" && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter by delivery stage"
        >
          {(["", ...fulfilmentStatuses] as const).map((stage) => (
            <button
              key={stage || "all"}
              type="button"
              aria-pressed={filters.fulfilment === stage}
              onClick={() => apply({ ...filters, fulfilment: stage })}
              className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm font-medium capitalize ${filters.fulfilment === stage ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "text-muted-foreground bg-white"}`}
            >
              {stage || "All"}
            </button>
          ))}
        </div>
      )}
      <ValidatedForm
        schema={fulfilmentFiltersSchema}
        defaultValues={filters}
        values={filters}
        onSubmit={apply}
        className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
      >
        <FormInputField
          name="from"
          id="fulfilment-from"
          type="date"
          label="From"
        />
        <FormInputField
          name="through"
          id="fulfilment-through"
          type="date"
          label="Through"
        />
        <div>
          <label
            htmlFor="fulfilment-status"
            className="mb-2 block text-sm font-medium"
          >
            Delivery stage
          </label>
          <FormSelect
            name="fulfilment"
            id="fulfilment-status"
            className="form-input h-11"
          >
            <option value="">All stages</option>
            {fulfilmentStatuses.map((stage) => (
              <option key={stage} value={stage}>
                {stage[0].toUpperCase() + stage.slice(1)}
              </option>
            ))}
          </FormSelect>
        </div>
        <Button type="submit" variant="outline" className="h-11">
          Apply filters
        </Button>
        <p className="text-muted-foreground col-span-full text-xs">
          Dates use Africa/Lagos and include the selected end day.
        </p>
      </ValidatedForm>
      {query.isError ? (
        <ContentError
          title={
            view === "orders"
              ? "We couldn’t load orders"
              : "We couldn’t load fulfilment orders"
          }
          description={fulfilmentErrorDescription(query.error)}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <section
          className="overflow-hidden rounded-xl border bg-white"
          aria-label={view === "orders" ? "Orders" : "Fulfilment orders"}
          aria-busy={query.isFetching}
        >
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[790px] text-left text-sm"
              aria-label={view === "orders" ? "Orders" : "Fulfilment orders"}
            >
              <thead className="bg-[#f7faf8] text-xs text-[#62756a]">
                <tr>
                  <th scope="col" className="px-5 py-4">
                    Order
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Placed
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Order status
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Delivery stage
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Destination
                  </th>
                  <th scope="col" className="px-5 py-4 text-right">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {query.isPending ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center">
                      Loading orders…
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-muted-foreground px-5 py-12 text-center"
                    >
                      No orders match these filters.
                    </td>
                  </tr>
                ) : (
                  records.map((order) => (
                    <tr key={order.id} className="hover:bg-[#f9fbfa]">
                      <td className="px-5 py-4 font-medium">
                        {order.orderCode ?? order.reference ?? order.id}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {new Date(order.placed).toLocaleString("en-NG", {
                          timeZone: "Africa/Lagos",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.fulfilment} />
                      </td>
                      <td className="px-5 py-4">
                        {order.delivery
                          ? `${order.delivery.city}, ${order.delivery.state}`
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold whitespace-nowrap">
                        {formatOrderAmount(order.total, order.currency)}
                      </td>
                      <td className="px-5 py-4">
                        {view === "orders" ? (
                          <Link
                            className="text-primary inline-flex min-h-10 items-center gap-1 font-semibold whitespace-nowrap"
                            href={`/admin/orders/${encodeURIComponent(order.id)}`}
                            aria-label={`View order details for ${order.orderCode ?? order.reference ?? order.id}`}
                          >
                            View order details
                            <ArrowRight className="size-4" aria-hidden />
                          </Link>
                        ) : (
                          <Link
                            className="text-primary inline-flex min-h-10 items-center gap-1 font-semibold whitespace-nowrap"
                            href={`/admin/fulfilment/${encodeURIComponent(order.id)}`}
                          >
                            Manage fulfilment
                            <ArrowRight className="size-4" aria-hidden />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-sm">
            <span className="text-muted-foreground">
              {query.data
                ? `${query.data.records} matching orders · Page ${page}`
                : ""}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!query.data?.isPrevious}
                onClick={() => {
                  setCursor({
                    value: query.data!.previousCursor,
                    navigation: "previous",
                  })
                  setPage(Math.max(1, page - 1))
                }}
              >
                Newer
              </Button>
              <Button
                variant="outline"
                disabled={!query.data?.isNext}
                onClick={() => {
                  setCursor({
                    value: query.data!.nextCursor,
                    navigation: "next",
                  })
                  setPage(page + 1)
                }}
              >
                Older
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
