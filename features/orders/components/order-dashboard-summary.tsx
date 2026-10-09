"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react"
import CustomerMetricCard from "@/components/customer/dashboard/customer-metric-card"
import { summarizeOrders, type SummaryOrder } from "../utils/order-summary"

export default function OrderDashboardSummary({
  orders,
  loading,
  workspace,
}: {
  orders?: SummaryOrder[]
  loading: boolean
  workspace: "customer" | "supplier" | "admin"
}) {
  const summary = orders ? summarizeOrders(orders) : null
  const customer = workspace === "customer"
  const value =
    summary?.value != null && summary.currency
      ? new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: summary.currency,
          maximumFractionDigits: 2,
        }).format(summary.value)
      : "—"
  const metrics = [
    {
      title: "Orders in view",
      value: summary?.count ?? "—",
      description: "Orders in the loaded history",
      icon: ShoppingBag,
    },
    {
      title: "Awaiting payment",
      value: summary?.awaitingPayment ?? "—",
      description: "Pending or partly paid",
      icon: Clock3,
    },
    {
      title: "Paid orders",
      value: summary?.paid ?? "—",
      description: "Payment completed",
      icon: CheckCircle2,
    },
    {
      title: "Order value",
      value,
      description: "Combined value of loaded orders",
      icon: Wallet,
    },
  ]
  const shortcuts = customer
    ? [
        {
          title: "Browse products",
          description: "Find supplies for your next order",
          href: "/products",
          icon: Package,
        },
        {
          title: "Your shopping bag",
          description: "Review items ready for checkout",
          href: "/cart",
          icon: ShoppingBag,
        },
        {
          title: "Delivery addresses",
          description: "Manage your delivery details",
          href: "/customer/addresses",
          icon: MapPin,
        },
      ]
    : [
        {
          title: "Manage products",
          description: "Keep your catalogue up to date",
          href: `/${workspace}/products`,
          icon: Package,
        },
        {
          title: "Check inventory",
          description: "Review stock before fulfilment",
          href: `/${workspace}/inventory`,
          icon: Boxes,
        },
        {
          title: workspace === "admin" ? "Customers" : "Account",
          description:
            workspace === "admin"
              ? "Review customer information"
              : "Review your business information",
          href:
            workspace === "admin" ? "/admin/customers" : "/supplier/account",
          icon: CreditCard,
        },
      ]
  return (
    <div className="space-y-5">
      <section
        aria-label="Order summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <CustomerMetricCard
            key={metric.title}
            {...metric}
            loading={loading}
          />
        ))}
      </section>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-[#dfe8e1] bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-[#2b4032]">At a glance</h2>
          <p className="mt-2 text-sm leading-6 text-[#5e6f63]">
            {loading
              ? "Loading your order overview…"
              : !summary
                ? "Your summary will appear when order information is available."
                : summary.count === 0
                  ? customer
                    ? "Your next purchase starts here. Browse the catalogue and add products to your bag."
                    : "New orders and payment updates will appear here as they arrive."
                  : customer
                    ? "Review payment progress and keep track of your purchases below."
                    : "Review incoming orders and payment progress before fulfilment."}
          </p>
          {summary && summary.count > 0 && summary.paid !== null && (
            <div className="mt-5">
              <div className="mb-2 flex justify-between gap-3 text-xs text-[#65776a]">
                <span>Fully paid</span>
                <span>
                  {summary.paid} of {summary.count} orders
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Fully paid orders"
                aria-valuenow={summary.paid}
                aria-valuemin={0}
                aria-valuemax={summary.count}
                className="h-2 overflow-hidden rounded-full bg-[#edf2ee]"
              >
                <div
                  style={{ width: `${(summary.paid / summary.count) * 100}%` }}
                  className="h-full rounded-full bg-[#168454]"
                />
              </div>
              {summary.failed !== null && summary.failed > 0 && (
                <p className="mt-3 text-xs text-[#9a5c24]">
                  {summary.failed}{" "}
                  {summary.failed === 1 ? "order has" : "orders have"} a failed
                  payment.
                </p>
              )}
            </div>
          )}
        </section>
        <nav
          aria-label="Order quick actions"
          className="divide-y divide-[#e7ece9] rounded-xl border border-[#dfe8e1] bg-white px-5"
        >
          {shortcuts.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-[#167b54]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f0f6f2] text-[#62856e]">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[#344d3a] group-hover:text-[#087d49]">
                  {title}
                </span>
                <span className="mt-1 block text-xs text-[#5e6f63]">
                  {description}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-4 shrink-0 text-[#849b8b]"
              />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
