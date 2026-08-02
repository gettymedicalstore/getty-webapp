import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getServerCart } from "@/features/cart/api/get-server-cart"
import CheckoutPageContent from "@/features/checkout/components/store/checkout-page-content"
import type { CheckoutCustomer } from "@/features/checkout/types/checkout"
import { getSession } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Checkout | Getty Medical Store",
  description: "Complete your Getty Medical Store order securely.",
}

type CheckoutPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[]
  }>
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const [resolvedSearchParams, session] = await Promise.all([
    searchParams,
    getSession(),
  ])

  if (!session?.user) {
    const requestedCallbackUrl = getSingleValue(
      resolvedSearchParams.callbackUrl
    )

    const callbackUrl = getSafeCallbackUrl(requestedCallbackUrl, "/checkout")

    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const cart = await getServerCart()

  if (!cart || cart.items.length === 0) {
    redirect("/cart")
  }

  const customer: CheckoutCustomer = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    phone: session.user.phone ?? "",
  }

  return <CheckoutPageContent initialCart={cart} customer={customer} />
}

function getSingleValue(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Only permits internal application paths as callback URLs.
 * This prevents redirecting users to an external or unsafe URL.
 */
function getSafeCallbackUrl(
  value: string | undefined,
  fallback: string
): string {
  if (!value) {
    return fallback
  }

  const normalizedValue = value.trim()

  if (
    !normalizedValue.startsWith("/") ||
    normalizedValue.startsWith("//") ||
    normalizedValue.includes("\\")
  ) {
    return fallback
  }

  return normalizedValue
}
