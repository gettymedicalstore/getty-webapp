"use client"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Heart, Package, ShoppingCart, Wallet } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useCart } from "@/features/cart/hooks/use-cart"
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist"
import PageHeading from "@/components/shared/page-heading"
import EmptyState from "@/components/shared/empty-state"
import CustomerMetricCard from "@/components/customer/dashboard/customer-metric-card"
import { formatCurrency } from "@/features/products/utils/format-currency"
import {
  defaultOrderFilters,
  getOrders,
} from "@/features/orders/api/order-management"
import { useState } from "react"
import CustomerOrders from "./orders"
export default function CustomerDashboard() {
  const { data: session } = useAuthSession()
  const [filters] = useState(defaultOrderFilters)
  const orders = useQuery({
      queryKey: [
        "orders",
        session?.user?.id,
        "customer",
        filters,
        { cursor: 0, navigation: "next" },
      ],
      queryFn: () => getOrders("customer", filters),
      enabled: Boolean(session?.user),
    }),
    wishlist = useWishlist(),
    { cart, isPending: cartPending, isError: cartError } = useCart()
  const records = orders.data?.items ?? []
  return (
    <div className="space-y-8">
      <PageHeading
        title="Dashboard"
        description={`Welcome back${session?.user ? `, ${session.user.name.split(" ")[0]}` : ""}. Your shopping, all in one place.`}
        action={
          <Link
            href="/products"
            className="bg-primary inline-flex h-11 items-center rounded-lg px-5 text-sm font-semibold text-white"
          >
            Continue shopping
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CustomerMetricCard
          title="Orders this month"
          loading={orders.isPending}
          value={orders.isError ? "—" : (orders.data?.records ?? "—")}
          icon={Package}
        />
        <CustomerMetricCard
          title="Recent order value"
          loading={orders.isPending}
          value={
            orders.isError
              ? "—"
              : formatCurrency(records.reduce((sum, o) => sum + o.total, 0))
          }
          description="Loaded orders; before refunds"
          icon={Wallet}
        />
        <CustomerMetricCard
          title="Saved products"
          loading={wishlist.isPending}
          value={wishlist.products.length}
          icon={Heart}
        />
        <CustomerMetricCard
          title="Items in cart"
          loading={cartPending}
          value={cartError ? "—" : cart.itemCount}
          icon={ShoppingCart}
        />
      </div>
      <CustomerOrders embedded />
      <div className="grid gap-4 md:grid-cols-2">
        <EmptyState
          title="Your favourites"
          description={
            wishlist.products.length
              ? `${wishlist.products.length} saved products are waiting for you.`
              : "Save products you love so you can find them again."
          }
          icon={Heart}
          action={
            <Link href="/wishlist" className="text-primary font-semibold">
              Open wishlist →
            </Link>
          }
        />
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Your account</h2>
          <p className="text-muted-foreground mt-3 text-sm break-all">
            {session?.user?.email}
          </p>
          <div className="mt-6 grid gap-4 text-sm">
            <Link href="/customer/profile" className="text-primary font-medium">
              Update your profile →
            </Link>
            <Link
              href="/customer/addresses"
              className="text-primary font-medium"
            >
              Manage delivery addresses →
            </Link>
            <Link href="/contact" className="text-primary font-medium">
              Get help with an order →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
