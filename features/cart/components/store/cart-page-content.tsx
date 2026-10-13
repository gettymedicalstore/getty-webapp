"use client"
import { CartSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"

import { useCart } from "../../hooks/use-cart"
import CartItems from "./cart-items"
import CartOrderSummary from "./cart-order-summary"
import EmptyCart from "./empty-cart"

export default function CartPageContent() {
  const {
    cart,
    isPending,
    isError,
    syncError,
    refetch,
    error,
    guestItems,
    guestMergePending,
    isSyncing,
    retryGuestMerge,
  } = useCart()

  if (isError)
    return (
      <div className="site-container py-12">
        <ContentError
          title="Your bag is temporarily unavailable"
          description={error?.message}
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
              {guestMergePending
                ? "Your saved bag update has not been confirmed yet. Try again to check it safely before changing these items."
                : (error?.message ??
                  "Some saved items need your attention. Adjust their quantities or remove them to continue.")}
            </p>
            <button
              type="button"
              onClick={() => void retryGuestMerge()}
              disabled={isSyncing}
              className="min-h-10 rounded-lg border border-amber-300 px-4 font-semibold hover:bg-amber-100"
            >
              {isSyncing ? "Saving your bag…" : "Try again"}
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
        {guestItems.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-white p-5 sm:p-8">
            <h2 className="text-xl font-semibold text-[#23412d]">
              Saved items to review
            </h2>
            <p className="text-muted-foreground mt-2 mb-5 text-sm leading-6">
              These items are still saved on this device. Prices and
              availability will be checked again when they are added to your
              account bag.
            </p>
            <CartItems items={guestItems} guest />
          </div>
        )}
        {cart.items.length === 0 ? (
          guestItems.length ? null : (
            <EmptyCart />
          )
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
