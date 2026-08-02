"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/hooks/use-cart"

type PaymentSuccessHandlerProps = {
  reference?: string
  orderId?: string
}

const destination = "/customer/dashboard"

export default function PaymentSuccessHandler({
  reference,
  orderId,
}: PaymentSuccessHandlerProps) {
  const router = useRouter()
  const hasProcessed = useRef(false)
  const [isClearingCart, setIsClearingCart] = useState(true)

  const { clearCart } = useCart()

  useEffect(() => {
    if (hasProcessed.current) {
      return
    }

    hasProcessed.current = true

    async function processSuccessfulPayment() {
      try {
        await clearCart({
          notify: false,
        })

        toast.success("Payment completed successfully.")
      } catch (error) {
        console.error("Unable to clear cart after payment:", error)

        toast.error(
          "Payment succeeded, but the cart could not be cleared automatically."
        )
      } finally {
        setIsClearingCart(false)
      }
    }

    void processSuccessfulPayment()
  }, [clearCart])

  function continueToDashboard() {
    const dashboardUrl = new URL(destination, window.location.origin)

    dashboardUrl.searchParams.set("payment", "success")

    if (reference) {
      dashboardUrl.searchParams.set("reference", reference)
    }

    if (orderId) {
      dashboardUrl.searchParams.set("orderId", orderId)
    }

    router.replace(`${dashboardUrl.pathname}${dashboardUrl.search}`)
  }

  return (
    <section className="flex min-h-[65vh] items-center justify-center bg-[#F7F7F7] px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-[#E9EAEB] bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 aria-hidden="true" className="size-8 text-[#058A51]" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-[#181D27]">
          Payment successful
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#717680]">
          Your payment has been confirmed and your order is being processed.
        </p>

        {reference && (
          <p className="mt-4 text-xs break-all text-[#717680]">
            Payment reference:{" "}
            <span className="font-medium text-[#414651]">{reference}</span>
          </p>
        )}

        <Button
          type="button"
          onClick={continueToDashboard}
          disabled={isClearingCart}
          className="mt-8 h-12 w-full rounded-lg bg-[#058A51] font-semibold text-white hover:bg-[#027A48]"
        >
          {isClearingCart ? "Finalising order..." : "Continue to Dashboard"}
        </Button>
      </div>
    </section>
  )
}
