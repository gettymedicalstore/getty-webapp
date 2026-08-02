import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref")

  if (!reference) {
    return redirectToFailure(request, "missing-reference")
  }

  try {
    const payment = await verifyPayment(reference)

    if (!payment.success) {
      return redirectToFailure(request, "verification-failed")
    }

    /*
     * Before redirecting:
     *
     * 1. Confirm the amount.
     * 2. Confirm the currency.
     * 3. Confirm the order reference.
     * 4. Confirm the authenticated customer.
     * 5. Mark the order as paid.
     */

    const successUrl = new URL("/payment/success", request.nextUrl.origin)

    successUrl.searchParams.set("reference", reference)

    return NextResponse.redirect(successUrl)
  } catch (error) {
    console.error("Payment verification failed:", error)

    return redirectToFailure(request, "verification-error")
  }
}

async function verifyPayment(reference: string) {
  const response = await fetch(
    `${process.env.PAYMENT_API_URL}/transaction/verify/${encodeURIComponent(
      reference
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYMENT_SECRET_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    return {
      success: false,
    }
  }

  const result = await response.json()

  return {
    success: result.data?.status === "success",
    data: result.data,
  }
}

function redirectToFailure(request: NextRequest, reason: string) {
  const failureUrl = new URL("/checkout", request.nextUrl.origin)

  failureUrl.searchParams.set("payment", "failed")

  failureUrl.searchParams.set("reason", reason)

  return NextResponse.redirect(failureUrl)
}
