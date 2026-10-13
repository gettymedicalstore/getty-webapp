"use client"
import Link from "next/link"
import { LockKeyhole, ArrowRight } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useCart } from "../../hooks/use-cart"
import { Skeleton } from "@/components/ui/skeleton"
import { authHref, reauthenticationHref } from "@/lib/auth/navigation"
import { formatCurrency } from "@/features/products/utils/format-currency"
import type { CartItem } from "../../types/cart"

export default function CartOrderSummary({ items }: { items: CartItem[] }) {
  const session = useAuthSession(),
    state = useCart(),
    cart = state.cart,
    remote = cart.mode === "remote"
  const unavailable =
    cart.expired ||
    items.some(
      (item) => item.purchasable === false || item.priceAvailable === false
    )
  const blocked =
    state.isUpdating ||
    state.syncError ||
    state.isPending ||
    unavailable ||
    !items.length
  const subtotal = remote
    ? cart.subtotal
    : items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const destination = session.data?.user
    ? session.data.user.role === "customer"
      ? "/checkout"
      : reauthenticationHref("/checkout")
    : authHref("/login", "/checkout")
  return (
    <aside className="min-w-0 self-start rounded-2xl border bg-[#f7f9f5] p-5 sm:p-6 lg:sticky lg:top-6">
      <h2 className="text-xl font-semibold tracking-tight text-[#23412d]">
        Order summary
      </h2>
      <dl className="mt-6 space-y-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium">{formatCurrency(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="text-right">Calculated at checkout</dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-5 text-lg font-semibold">
          <dt>Estimated total before delivery</dt>
          <dd className="text-right [overflow-wrap:anywhere]">
            {formatCurrency(subtotal)}
          </dd>
        </div>
      </dl>
      {unavailable && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          Update the unavailable items in your bag before continuing.
        </p>
      )}
      {session.isPending ? (
        <Skeleton className="mt-6 h-12 w-full" />
      ) : session.isError ? (
        <p role="alert" className="mt-6 text-sm">
          Your account could not be checked.{" "}
          <button
            type="button"
            onClick={() => void session.refetch()}
            className="text-primary min-h-11 underline"
          >
            Try again
          </button>
        </p>
      ) : blocked ? (
        <button
          type="button"
          disabled
          className="bg-primary mt-6 min-h-12 w-full rounded-xl text-sm font-semibold text-white opacity-50"
        >
          {state.isUpdating
            ? "Updating your bag…"
            : state.syncError
              ? "Resolve bag items to checkout"
              : "Continue to checkout"}
        </button>
      ) : (
        <Link
          href={destination}
          className="bg-primary hover:bg-primary-darker mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
        >
          Checkout
          <ArrowRight className="size-4" />
        </Link>
      )}
      {!remote && (
        <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-5">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" />
          {session.data?.user?.role === "customer"
            ? "Prices and availability are confirmed when you order."
            : "Sign in with a customer account at checkout. Prices and availability are confirmed when you order."}
        </p>
      )}
    </aside>
  )
}
