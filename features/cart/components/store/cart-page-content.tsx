"use client"

import { useCart } from "../../hooks/use-cart"
import CartItems from "./cart-items"
import CartOrderSummary from "./cart-order-summary"
import EmptyCart from "./empty-cart"

export default function CartPageContent() {
  const { cart, isPending } = useCart()

  if (isPending) {
    return (
      <section className="bg-[#F5F5F5] py-10 sm:py-14">
        <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-0">
          <div className="h-[520px] animate-pulse rounded-sm bg-white" />
        </div>
      </section>
    )
  }

  return (
    <section className="bg-[#F5F5F5] py-10 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-0">
        {cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="rounded-sm border border-[#F5F5F5] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-14">
              <div className="min-w-0">
                <h1 className="font-geist text-2xl leading-8 font-semibold text-[#252B37]">
                  Order Summary
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
