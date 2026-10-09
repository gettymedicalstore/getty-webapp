"use client"
import { CartSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"

import { useCart } from "../../hooks/use-cart"
import CartItems from "./cart-items"
import CartOrderSummary from "./cart-order-summary"
import EmptyCart from "./empty-cart"

export default function CartPageContent() {
  const { cart, isPending, isError, syncError, refetch } = useCart()

  if (isError)
    return (
      <div className="site-container py-12">
        <ContentError
          title="Your bag is temporarily unavailable"
          onRetry={() => void refetch()}
        />
      </div>
    )
  if (isPending) return <CartSkeleton />

  return (
    <section className="bg-[#f7f9f5] py-10 sm:py-14 lg:py-16">
      <div className="site-container">
        {syncError && (
          <div
            role="status"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950"
          >
            <p>
              Some items could not be moved to your account bag. Adjust or
              remove them, then try again.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-10 rounded-lg border border-amber-300 px-4 font-semibold hover:bg-amber-100"
            >
              Try again
            </button>
          </div>
        )}
        {cart.expired && (
          <p
            role="status"
            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
          >
            This cart has expired. Your items are shown below; update quantities
            to check current prices and availability.
          </p>
        )}
        {cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="rounded-2xl border border-[#e3eae3] bg-white p-5 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
              <div className="min-w-0">
                <h1 className="font-geist text-2xl leading-8 font-semibold text-[#252B37]">
                  Your shopping bag
                </h1>

                <div className="mt-8">
                  <CartItems items={cart.items} />
                </div>
              </div>

              <CartOrderSummary items={cart.items} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
