"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  ArrowUpRight,
  FolderTree,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react"
import PageHeading from "@/components/shared/page-heading"
import ContentError from "@/components/shared/content-error"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAdminDashboard, type AdminDashboardData } from "../api/dashboard"

const number = new Intl.NumberFormat("en-NG")
const panel =
  "rounded-xl border border-[#e1e9e4] bg-white shadow-[0_2px_4px_rgba(25,45,32,.02)]"

function monthLabel(month: string, short = false) {
  const [year, value] = month.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    ...(short ? {} : { year: "numeric" as const }),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000 + year, value - 1, 1)))
}

export function OrderTrend({
  records,
}: {
  records: AdminDashboardData["orderTrend"]
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const latest = records.at(-1)
  const previous = records.at(-2)
  const selected =
    records.find((item) => item.month === selectedMonth) ?? latest
  const total = records.reduce((sum, item) => sum + item.value, 0)
  const max = Math.max(3, ...records.map((item) => item.value))
  const step = Math.max(1, Math.ceil(max / 3))
  const ceiling = step * 3
  const currentMonth = new Intl.DateTimeFormat("en-GB", {
    month: "2-digit",
    year: "2-digit",
    timeZone: "Africa/Lagos",
  })
    .format(new Date())
    .split("/")
    .reverse()
    .join("-")
  const current = latest?.month === currentMonth

  return (
    <section
      className={cn(panel, "min-w-0 p-5 sm:p-6")}
      aria-labelledby="order-trend-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="order-trend-title"
            className="text-lg font-semibold text-[#2b4032]"
          >
            Order trend
          </h2>
          <p className="mt-1 text-sm text-[#5e6f63]">
            {records.length
              ? `${monthLabel(records[0].month)} – ${monthLabel(latest!.month)} · Orders placed`
              : "Monthly orders will appear here."}
          </p>
        </div>
        {current && (
          <span className="rounded-md bg-[#f1f6f2] px-3 py-1.5 text-xs text-[#65776a]">
            Current month is partial
          </span>
        )}
      </div>
      {latest ? (
        <>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-b border-[#e6ece8] pb-5">
            {[
              { label: `${records.length} months shown`, value: total },
              ...(previous
                ? [
                    {
                      label: `Previous month · ${monthLabel(previous.month, true)}`,
                      value: previous.value,
                    },
                  ]
                : []),
              {
                label: `${current ? "This" : "Latest"} month · ${monthLabel(latest.month, true)}`,
                value: latest.value,
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-[#5e6f63]">{label}</dt>
                <dd className="mt-1.5 text-2xl font-semibold tracking-tight text-[#2b4032]">
                  {number.format(value)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 overflow-x-auto pb-2">
            <div
              className="relative min-w-[540px] pl-10"
              role="group"
              aria-label="Monthly order counts. Select a month for details."
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-48"
              >
                {[3, 2, 1, 0].map((tick) => (
                  <div
                    key={tick}
                    className="absolute inset-x-0 flex items-center gap-3"
                    style={{ top: `${((3 - tick) / 3) * 100}%` }}
                  >
                    <span className="w-7 shrink-0 text-right text-[11px] text-[#5e6f63]">
                      {number.format(step * tick)}
                    </span>
                    <span className="h-px flex-1 bg-[#e7ede9]" />
                  </div>
                ))}
              </div>
              <div
                className="relative grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${records.length}, minmax(0, 1fr))`,
                }}
              >
                {records.map((item) => (
                  <button
                    key={item.month}
                    type="button"
                    aria-pressed={selected?.month === item.month}
                    aria-label={`${monthLabel(item.month)}: ${number.format(item.value)} orders`}
                    onClick={() => setSelectedMonth(item.month)}
                    className="group rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#087d49] focus-visible:ring-offset-4"
                  >
                    <span className="flex h-48 items-end justify-center">
                      <span
                        className={cn(
                          "block w-full max-w-11 rounded-t transition-colors group-hover:bg-[#087d49]",
                          selected?.month === item.month
                            ? "bg-[#087d49] ring-2 ring-[#087d49] ring-offset-2"
                            : "bg-[#4b9d79]"
                        )}
                        style={{
                          height: item.value
                            ? `${(item.value / ceiling) * 100}%`
                            : "2px",
                        }}
                      />
                    </span>
                    <span className="mt-3 block text-[11px] text-[#5e6f63]">
                      {item.month}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-[#536357]" aria-live="polite">
            {selected &&
              `${monthLabel(selected.month)} · ${number.format(selected.value)} ${selected.value === 1 ? "order" : "orders"} placed${selected.month === currentMonth ? " so far" : ""}`}
          </p>
          {total === 0 && (
            <p className="mt-1 text-xs text-[#5e6f63]">
              No orders were placed during this period.
            </p>
          )}
        </>
      ) : (
        <div className="flex min-h-52 items-center justify-center text-sm text-[#5e6f63]">
          No order trend data yet
        </div>
      )}
    </section>
  )
}

function text(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === "string" && value.trim() ? value : null
}

function AttentionList({
  kind,
  records,
  pending,
}: {
  kind: "orders" | "products"
  records: Record<string, unknown>[]
  pending?: number
}) {
  const orders = kind === "orders"
  const Icon = orders ? ShoppingBag : ShieldCheck
  return (
    <section className={cn(panel, "flex min-w-0 flex-col")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8ede9] p-5 sm:p-6">
        <div>
          <h2 className="font-semibold text-[#2b4032]">
            {orders ? "Recent orders" : "Awaiting approval"}
          </h2>
          <p className="mt-1.5 text-xs text-[#5e6f63]">
            {orders
              ? "Orders that need your attention"
              : "Products waiting for your review"}
          </p>
        </div>
        <span className="rounded-md bg-[#edf6f0] px-2.5 py-1.5 text-xs font-medium text-[#426953]">
          {orders
            ? "Needs attention"
            : `${number.format(pending ?? 0)} pending`}
        </span>
      </div>
      {records.length ? (
        <ul className="divide-y divide-[#e8ede9] px-5 sm:px-6">
          {records.map((record, index) => {
            const id = text(record, "id")
            const name =
              text(record, orders ? "reference" : "name") ??
              `${orders ? "Order" : "Product"} ${index + 1}`
            const status = text(record, "status")
            return (
              <li
                key={id ?? index}
                className="flex items-center justify-between gap-4 py-5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words text-[#344d3a]">
                    {name}
                  </p>
                  {status && (
                    <p className="mt-1 text-xs text-[#5e6f63]">
                      {status.replaceAll("_", " ")}
                    </p>
                  )}
                </div>
                <Link
                  href={
                    !orders && id
                      ? `/admin/products/${encodeURIComponent(id)}`
                      : `/admin/${kind}`
                  }
                  className="shrink-0 py-2 text-xs font-semibold text-[#087d49] hover:underline"
                  aria-label={`View details for ${name}`}
                >
                  View details
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex min-h-56 flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <span className="mb-4 grid size-12 place-items-center rounded-xl bg-[#f0f6f2] text-[#779883]">
            <Icon aria-hidden className="size-6" strokeWidth={1.5} />
          </span>
          <h3 className="text-sm font-semibold text-[#344d3a]">
            {orders
              ? "No orders need attention"
              : pending
                ? "No recent products to show"
                : "You’re all caught up"}
          </h3>
          <p className="mt-2 max-w-xs text-xs leading-5 text-[#5e6f63]">
            {orders
              ? "Orders requiring attention will appear here."
              : pending
                ? "Open the product list to review pending products."
                : "Products submitted for approval will appear here."}
          </p>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#e8ede9] px-5 py-3 sm:px-6">
        <span className="text-xs text-[#5e6f63]">
          {records.length
            ? `${records.length} recent ${kind}`
            : "No recent items"}
        </span>
        <Link
          href={`/admin/${kind}`}
          className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#087d49] hover:underline"
        >
          View all {kind}
          <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </section>
  )
}

export function AdminDashboardOverview({ data }: { data: AdminDashboardData }) {
  const share = (value: number) =>
    data.totalAccounts
      ? `${((value / data.totalAccounts) * 100).toFixed(1)}% of accounts`
      : "No accounts yet"
  const metrics = [
    {
      label: "Total accounts",
      value: data.totalAccounts,
      description: "Customers and vendors",
      icon: UsersRound,
    },
    {
      label: "Customers",
      value: data.customers,
      description: share(data.customers),
      icon: UserRound,
      href: "/admin/customers",
    },
    {
      label: "Vendors",
      value: data.vendors,
      description: share(data.vendors),
      icon: Store,
      href: "/admin/vendors",
    },
    {
      label: "Products",
      value: data.totalProducts,
      description: "All product statuses",
      icon: Package,
      href: "/admin/products",
    },
    {
      label: "Categories",
      value: data.totalCategories,
      description: "Across your catalogue",
      icon: FolderTree,
      href: "/admin/categories",
    },
  ]
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {metrics.map(({ label, value, description, icon: Icon, href }) => (
          <article
            key={label}
            className={cn(
              panel,
              "relative p-4 last:col-span-2 sm:p-5 xl:last:col-span-1"
            )}
          >
            <h2 className="flex items-center gap-2 text-xs font-medium text-[#5e6f63]">
              <Icon aria-hidden className="size-4 shrink-0" />
              {href ? (
                <Link
                  className="after:absolute after:inset-0 after:rounded-xl hover:text-[#087d49] focus-visible:outline-2 focus-visible:outline-[#087d49]"
                  href={href}
                >
                  {label}
                </Link>
              ) : (
                label
              )}
            </h2>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#2b4032]">
              {number.format(value)}
            </p>
            <p className="mt-3 text-xs text-[#5e6f63]">{description}</p>
          </article>
        ))}
      </div>
      <OrderTrend records={data.orderTrend} />
      <div className="grid items-stretch gap-5 xl:grid-cols-2">
        <AttentionList
          kind="orders"
          records={data.recentOrdersAwaitingAttention}
        />
        <AttentionList
          kind="products"
          records={data.recentProductsAwaitingApproval}
          pending={data.pendingProductReviews}
        />
      </div>
    </>
  )
}

export default function AdminDashboard() {
  const query = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: ({ signal }) => getAdminDashboard(signal),
  })
  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
        description="An overview of your accounts, catalogue and orders."
        action={
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            aria-busy={query.isFetching}
          >
            <RotateCcw
              aria-hidden
              className={cn("size-4", query.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />
      {query.isPending ? (
        <div
          role="status"
          aria-label="Loading admin dashboard"
          className="space-y-5"
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
          <Skeleton className="h-96" />
          <div className="grid gap-5 xl:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      ) : query.isError ? (
        <ContentError
          title="Your overview is temporarily unavailable"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <AdminDashboardOverview data={query.data} />
      )}
    </div>
  )
}
