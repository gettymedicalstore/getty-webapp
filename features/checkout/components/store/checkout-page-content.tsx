"use client"
import Link from "next/link"
import { LockKeyhole } from "lucide-react"
import AuthBoundary from "@/features/auth/components/auth-boundary"
import { useCart } from "@/features/cart/hooks/use-cart"
import { CartSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import EmptyCart from "@/features/cart/components/store/empty-cart"
export default function CheckoutPageContent() {
  return (
    <AuthBoundary roles={["customer"]}>
      <CheckoutStatus />
    </AuthBoundary>
  )
}
function CheckoutStatus() {
  const state = useCart()
  if (state.isPending) return <CartSkeleton />
  if (state.isError)
    return (
      <div className="site-container py-12">
        <ContentError
          title="Your bag is temporarily unavailable"
          onRetry={() => void state.refetch()}
        />
      </div>
    )
  if (!state.cart.items.length)
    return (
      <div className="site-container py-12">
        <EmptyCart />
      </div>
    )
  return (
    <div className="site-container py-12">
      <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center">
        <LockKeyhole className="text-primary mx-auto size-10" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Your bag is safely saved
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Checkout is temporarily unavailable. You can keep managing your bag or
          contact us for help with your order.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="bg-primary inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold text-white"
            href="/cart"
          >
            Back to your bag
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border px-5 text-sm"
            href="/contact"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  )
}
