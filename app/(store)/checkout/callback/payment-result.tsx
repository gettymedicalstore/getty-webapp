"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/hooks/use-cart"

type PaymentResultProps = {
  successful: boolean
  title: string
  description: string
  reference?: string
}

const successDestination = "/customer/dashboard"
const failureDestination = "/cart"

export default function PaymentResult({
  successful,
  title,
  description,
  reference,
}: PaymentResultProps) {
  const router = useRouter()
  const hasProcessed = useRef(false)
  const [isFinalising, setIsFinalising] = useState(successful)

  const { clearCart } = useCart()

  useEffect(() => {
    if (!successful || hasProcessed.current) {
      setIsFinalising(false)
      return
    }

    hasProcessed.current = true

    async function finaliseSuccessfulPayment() {
      try {
        await clearCart({
          notify: false,
        })

        toast.success("Payment completed successfully.")
      } catch (error) {
        console.error("Unable to clear the cart after payment:", error)

        toast.error(
          "Payment succeeded, but the cart could not be cleared automatically."
        )
      } finally {
        setIsFinalising(false)
      }
    }

    void finaliseSuccessfulPayment()
  }, [clearCart, successful])

  function handleContinue() {
    if (successful) {
      const params = new URLSearchParams({
        payment: "success",
      })

      if (reference) {
        params.set("reference", reference)
      }

      router.replace(`${successDestination}?${params.toString()}`)

      return
    }

    router.replace(failureDestination)
  }

  return (
    <section className="flex min-h-[65vh] items-center justify-center bg-[#F7F7F7] px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-[#E9EAEB] bg-white p-8 text-center shadow-[0_12px_40px_rgba(16,24,40,0.08)] sm:p-12">
        <div
          className={`mx-auto flex size-16 items-center justify-center rounded-full ${
            successful ? "bg-[#ECFDF3]" : "bg-[#FEF3F2]"
          }`}
        >
          {successful ? (
            <CheckCircle2
              aria-hidden
              className="size-8 text-[#058A51]"
              strokeWidth={1.8}
            />
          ) : (
            <AlertCircle
              aria-hidden
              className="size-8 text-[#D92D20]"
              strokeWidth={1.8}
            />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-[#181D27]">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#717680]">
          {description}
        </p>

        {reference ? (
          <div className="mt-6 rounded-lg border border-[#E9EAEB] bg-[#FAFAFA] px-4 py-3">
            <p className="text-xs text-[#717680]">Payment reference</p>

            <p className="mt-1 text-sm font-medium break-all text-[#414651]">
              {reference}
            </p>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={handleContinue}
          disabled={isFinalising}
          className={`mt-8 h-12 w-full rounded-lg text-sm font-semibold ${
            successful
              ? "bg-[#058A51] text-white hover:bg-[#027A48]"
              : "bg-[#D92D20] text-white hover:bg-[#B42318]"
          }`}
        >
          {isFinalising ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Finalising order...
            </>
          ) : successful ? (
            "Continue to Dashboard"
          ) : (
            "Return to Cart"
          )}
        </Button>
      </div>
    </section>
  )
}
