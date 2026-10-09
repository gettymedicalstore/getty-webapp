"use client"
import { useQuery } from "@tanstack/react-query"
import {
  Wallet,
  ShoppingCart,
  ClipboardList,
  Package,
  Users,
  ArrowUpRight,
  Boxes,
} from "lucide-react"
import Link from "next/link"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import PageHeading from "@/components/shared/page-heading"
import EmptyState from "@/components/shared/empty-state"
import RecordTable from "@/components/shared/record-table"
import { unavailable } from "@/lib/api/client"
import { formatCurrency } from "@/features/products/utils/format-currency"
type Summary = {
  revenue: number
  orders: number
  products: number
  users: number
  pendingOrders: number
  pendingProducts: number
  pendingSuppliers: number
  enquiries: number
  recent: {
    id: string
    reference: string
    status: string
    total: number
    date: string
  }[]
}
export default function PortalDashboard({
  supplier = false,
}: {
  supplier?: boolean
}) {
  const base = supplier ? "/supplier" : "/admin",
    query = useQuery({
      queryKey: ["portal", "summary"],
      queryFn: async (): Promise<Summary> =>
        unavailable("Your dashboard totals are temporarily unavailable."),
    })
  if (query.isPending) return <DashboardSkeleton />
  if (query.isError)
    return (
      <div className="space-y-7">
        <PageHeading
          title="Dashboard"
          description="Your workspace for the everyday business of better care."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Products",
              description: "Keep your catalogue up to date",
              href: "products",
              icon: Package,
            },
            {
              title: "Inventory",
              description: "Review product availability",
              href: "inventory",
              icon: Boxes,
            },
            {
              title: "Orders",
              description: "View and manage your orders",
              href: "orders",
              icon: ClipboardList,
            },
          ].map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={`${base}/${href}`}
              className="group flex items-start gap-4 rounded-xl border border-[#e3e8e5] bg-white p-5 transition-colors hover:border-[#b3c7b7] hover:bg-[#fcfefb]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#f0f5ef] text-[#66856a]">
                <Icon aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#354b3b]">
                  {title}
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-[#6c7b70]">
                  {description}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="group-hover:text-primary size-4 shrink-0 text-[#89998a]"
              />
            </Link>
          ))}
        </div>
        <ContentError
          title="Your overview is temporarily unavailable"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    )
  const data = query.data,
    metrics = [
      {
        label: supplier ? "Total Revenue" : "Total Platform Revenue",
        value: formatCurrency(data.revenue),
        icon: Wallet,
        style: "bg-[#FF6B63]/10 text-[#b54738]",
      },
      {
        label: supplier ? "Pending Orders" : "Total Orders",
        value: supplier ? data.pendingOrders : data.orders,
        icon: ShoppingCart,
        style: "bg-[#FFFAEB] text-[#946200]",
      },
      {
        label: supplier ? "Total Orders" : "Total Products",
        value: supplier ? data.orders : data.products,
        icon: supplier ? ClipboardList : Package,
        style: "bg-muted text-[#526951]",
      },
      {
        label: supplier ? "Active Products" : "Total Users",
        value: supplier ? data.products : data.users,
        icon: supplier ? Package : Users,
        style: "bg-[#ECFDF3] text-[#027a48]",
      },
    ]
  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
        description={
          supplier
            ? "Manage your products, orders and payments."
            : "An overview of your marketplace."
        }
      />
      {supplier && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Incomplete registration</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Complete your company information before selling on the
              marketplace.
            </p>
          </div>
          <Link
            href="/supplier/registration"
            className="shrink-0 rounded-lg border bg-white px-4 py-3 text-sm font-semibold"
          >
            Complete registration
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, ...m }) => (
          <article
            key={m.label}
            className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-white p-6"
          >
            <div className="min-w-0">
              <p className="text-[28px] font-semibold tracking-[-.04em] break-words">
                {m.value}
              </p>
              <h2 className="text-muted-foreground mt-2 text-sm">{m.label}</h2>
            </div>
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-lg ${m.style}`}
            >
              <Icon aria-hidden className="size-6" strokeWidth={1.75} />
            </span>
          </article>
        ))}
      </div>
      {supplier ? (
        <EmptyState
          title="No recent orders"
          description="Your customer orders will appear here. Add products to prepare your catalogue."
          action={
            <Link
              href="/supplier/products"
              className="bg-primary rounded-lg px-5 py-3 text-sm font-semibold text-white"
            >
              Upload product
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-semibold">Pending actions</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Pending orders",
                    value: data.pendingOrders,
                    path: "orders",
                  },
                  {
                    label: "Pending products",
                    value: data.pendingProducts,
                    path: "products",
                  },
                  {
                    label: "Supplier registrations",
                    value: data.pendingSuppliers,
                    path: "suppliers",
                  },
                  {
                    label: "Customer enquiries",
                    value: data.enquiries,
                    path: "enquiries",
                  },
                ].map((a) => (
                  <Link
                    key={a.path}
                    href={`${base}/${a.path}`}
                    className="hover:bg-muted rounded-lg border p-4"
                  >
                    <p className="text-2xl font-semibold">{a.value}</p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {a.label} →
                    </p>
                  </Link>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Platform overview</h2>
              <dl className="divide-y">
                {[
                  ["Customers and suppliers", data.users],
                  ["Products", data.products],
                  ["Orders", data.orders],
                  ["Revenue", formatCurrency(data.revenue)],
                ].map(([name, value]) => (
                  <div
                    className="flex justify-between gap-3 py-4 text-sm"
                    key={name}
                  >
                    <dt className="text-muted-foreground">{name}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
          <section className="min-w-0 space-y-4">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            {data.recent.length ? (
              <RecordTable
                title="Recent orders"
                records={data.recent}
                columns={[
                  { key: "reference", label: "Order" },
                  { key: "total", label: "Total (NGN)" },
                  { key: "status", label: "Status" },
                ]}
              />
            ) : (
              <EmptyState
                title="No recent activity"
                description="New orders and marketplace activity will appear here."
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
