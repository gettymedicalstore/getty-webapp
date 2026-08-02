"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthDialog } from "@/features/auth/components/auth-dialog-provider"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useCheckoutPayment } from "@/features/checkout/hooks/use-checkout-payment"
import type {
  CheckoutPaymentMode,
  PaymentFrequency,
} from "@/features/checkout/types/payment"

import type { CartItem } from "../../types/cart"

const deliveryFee = 1800

const installmentOptions = [4, 6, 8, 10, 12, 14]

const paymentMethods = [
  {
    name: "Visa",
    image: "/images/payments/visa.svg",
  },
  {
    name: "Mastercard",
    image: "/images/payments/mastercard.svg",
  },
  {
    name: "PayPal",
    image: "/images/payments/paypal.svg",
  },
  {
    name: "Verve",
    image: "/images/payments/verve.svg",
  },
]

type CartOrderSummaryProps = {
  items: CartItem[]
}

export default function CartOrderSummary({ items }: CartOrderSummaryProps) {
  const checkoutMutation = useCheckoutPayment()
  const { openLogin } = useAuthDialog()

  const {
    data: session,
    refetch: refetchSession,
    isLoading: isSessionLoading,
    isFetching: isSessionFetching,
  } = useAuthSession()

  const [paymentPlanEnabled, setPaymentPlanEnabled] = useState(false)

  const [frequency, setFrequency] = useState<PaymentFrequency>("weekly")

  const [installmentCount, setInstallmentCount] = useState<number | null>(null)

  const authenticatedEmail = session?.user?.email?.trim().toLowerCase() ?? ""

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + item.product.price * normaliseQuantity(item.quantity),
        0
      ),
    [items]
  )

  const total = subtotal + deliveryFee
  const totalKobo = Math.round(total * 100)

  const compatibleOptions = installmentOptions.filter(
    (count) => totalKobo % count === 0
  )

  const installmentAmount =
    installmentCount !== null && totalKobo % installmentCount === 0
      ? total / installmentCount
      : null

  const paymentMode: CheckoutPaymentMode =
    paymentPlanEnabled && installmentCount !== null
      ? {
          type: "installment",
          frequency,
          installmentCount,
        }
      : {
          type: "full",
        }

  const isSessionBusy = isSessionLoading || isSessionFetching

  const isBusy = checkoutMutation.isPending || isSessionBusy

  function togglePaymentPlan(checked: boolean) {
    setPaymentPlanEnabled(checked)

    if (!checked) {
      setInstallmentCount(null)
    }
  }

  function validateCheckout() {
    if (items.length === 0) {
      toast.error("Your cart is empty.")
      return false
    }

    if (paymentPlanEnabled && installmentCount === null) {
      toast.error("Select the total number of instalments.")

      return false
    }

    return true
  }

  function startCheckout(email: string) {
    const normalisedEmail = email.trim().toLowerCase()

    if (!normalisedEmail) {
      toast.error("Your account email address could not be loaded.")

      return
    }

    checkoutMutation.mutate(
      {
        email: normalisedEmail,

        items: items.map((item) => ({
          productId: item.productId,
          quantity: normaliseQuantity(item.quantity),
        })),

        paymentMode,
      },
      {
        onError: (error) => {
          console.error("Checkout initialization failed:", error)

          toast.error(
            error instanceof Error
              ? error.message
              : "Checkout could not be started."
          )
        },
      }
    )
  }

  async function continueAfterLogin() {
    const result = await refetchSession()

    if (result.isError) {
      console.error("Session refetch failed after login:", result.error)

      toast.error(
        result.error instanceof Error
          ? result.error.message
          : "Your session could not be loaded after login."
      )

      return
    }

    const loggedInEmail = result.data?.user?.email?.trim().toLowerCase() ?? ""

    if (!loggedInEmail) {
      toast.error(
        "Login succeeded, but your account email could not be loaded."
      )

      return
    }

    startCheckout(loggedInEmail)
  }

  function handleCheckout() {
    if (isBusy) {
      return
    }

    if (!validateCheckout()) {
      return
    }

    if (authenticatedEmail) {
      startCheckout(authenticatedEmail)
      return
    }

    openLogin({
      onSuccess: continueAfterLogin,
    })
  }

  function getCheckoutButtonLabel() {
    if (checkoutMutation.isPending) {
      return "Preparing payment..."
    }

    if (isSessionBusy) {
      return "Checking account..."
    }

    if (!authenticatedEmail) {
      return "Login to Checkout"
    }

    if (paymentPlanEnabled) {
      return "Make First Payment"
    }

    return "Checkout"
  }

  return (
    <aside className="self-start rounded-xl bg-[#F7F7F7] p-5 sm:p-6">
      <h2 className="text-2xl leading-8 font-semibold text-[#252B37]">
        Checkout Summary
      </h2>

      <dl className="mt-7 space-y-5">
        <SummaryRow label="Subtotal" value={subtotal} />

        <SummaryRow label="Delivery Fee" value={deliveryFee} />

        <div className="flex items-end justify-between gap-5">
          <dt className="text-lg leading-7 text-[#252B37]">Total Amount</dt>

          <dd className="flex items-baseline font-semibold text-[#252B37]">
            <span className="mr-1 text-xs">NGN</span>

            <span className="text-2xl leading-8">{formatPrice(total)}</span>
          </dd>
        </div>
      </dl>

      <div className="my-7 h-px bg-[#E9EAEB]" />

      <div className="rounded-md border border-[#E9EAEB] bg-white p-4">
        <label className="flex cursor-pointer gap-3">
          <Checkbox
            checked={paymentPlanEnabled}
            onCheckedChange={(checked) => togglePaymentPlan(checked === true)}
            disabled={isBusy}
            aria-label="Enable payment plan"
            className="mt-0.5"
          />

          <span>
            <span className="block text-sm font-medium text-[#414651]">
              Payment Plan setup
            </span>

            <span className="block text-xs leading-4.5 text-[#717680]">
              Pay in instalments by setting the frequency
            </span>
          </span>
        </label>

        {paymentPlanEnabled && (
          <div className="mt-4">
            <div className="flex gap-2">
              {(["weekly", "monthly"] as PaymentFrequency[]).map((option) => {
                const active = frequency === option

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setFrequency(option)}
                    aria-pressed={active}
                    className={`h-9 rounded-lg border px-4 text-xs font-medium capitalize transition ${
                      active
                        ? "border-[#058A51] bg-[#058A51] text-white"
                        : "border-[#D5D7DA] bg-white text-[#414651] hover:bg-[#FAFAFA]"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Pay {option}
                  </button>
                )
              })}
            </div>

            <p className="mt-5 text-xs text-[#535862]">
              Select the total number of instalments
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {installmentOptions.map((count) => {
                const active = installmentCount === count

                const compatible = compatibleOptions.includes(count)

                return (
                  <button
                    key={count}
                    type="button"
                    disabled={!compatible || isBusy}
                    aria-pressed={active}
                    title={
                      compatible
                        ? undefined
                        : "The total cannot be divided evenly by this option."
                    }
                    onClick={() => setInstallmentCount(count)}
                    className={`size-9 rounded-lg border text-xs font-medium transition ${
                      active
                        ? "border-[#058A51] bg-[#058A51] text-white"
                        : "border-[#D5D7DA] bg-white text-[#414651] hover:bg-[#FAFAFA]"
                    } disabled:cursor-not-allowed disabled:opacity-35`}
                  >
                    {count}
                  </button>
                )
              })}
            </div>

            {installmentAmount !== null && (
              <p className="mt-5 text-xs text-[#535862]">
                You will pay{" "}
                <strong>NGN {formatPrice(installmentAmount)}</strong>{" "}
                {frequency}.
              </p>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleCheckout}
        disabled={isBusy || items.length === 0}
        aria-busy={isBusy}
        className="mt-5 h-12 w-full rounded-lg bg-[#058A51] text-sm font-semibold text-white hover:bg-[#027A48]"
      >
        {getCheckoutButtonLabel()}
      </Button>

      <div className="mt-8">
        <p className="text-sm text-[#252B37]">100% Guarantee Safe Checkout</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {paymentMethods.map((method) => (
            <div
              key={method.name}
              className="relative h-6 w-11 overflow-hidden"
            >
              <Image
                src={method.image}
                alt={method.name}
                fill
                sizes="44px"
                className="object-contain p-0.5"
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <dt className="text-lg text-[#252B37]">{label}</dt>

      <dd className="flex items-baseline font-medium text-[#252B37]">
        <span className="mr-1 text-xs">NGN</span>

        <span className="text-lg">{formatPrice(value)}</span>
      </dd>
    </div>
  )
}

function normaliseQuantity(value: number | undefined) {
  const quantity = Number(value)

  return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(value)
}
