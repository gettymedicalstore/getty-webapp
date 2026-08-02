import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  decodeMockOrder,
  encodeMockOrder,
  MOCK_ORDER_COOKIE,
} from "@/features/checkout/server/mock-order"
import {
  parsePaystackMetadata,
  verifyPaystackPayment,
} from "@/features/checkout/server/paystack"

export async function GET(request: NextRequest) {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref")

  if (!reference) {
    return redirectToResult(request, {
      status: "missing-reference",
    })
  }

  try {
    const transaction = await verifyPaystackPayment(reference)

    if (transaction.status !== "success") {
      return redirectToResult(request, {
        status: "payment-failed",
        reference,
      })
    }

    const metadata = parsePaystackMetadata(transaction.metadata)

    const metadataOrderId =
      typeof metadata.orderId === "string" ? metadata.orderId : null

    const orderCookie = request.cookies.get(MOCK_ORDER_COOKIE)?.value
    const order = decodeMockOrder(orderCookie)

    if (!order) {
      console.error("Pending order cookie was not found.", {
        reference,
        metadataOrderId,
      })

      return redirectToResult(request, {
        status: "order-not-found",
        reference,
      })
    }

    if (!metadataOrderId || metadataOrderId !== order.id) {
      console.error("Payment order ID mismatch.", {
        reference,
        metadataOrderId,
        storedOrderId: order.id,
      })

      return redirectToResult(request, {
        status: "order-mismatch",
        reference,
      })
    }

    if (order.paymentReference !== reference) {
      console.error("Payment reference mismatch.", {
        callbackReference: reference,
        storedReference: order.paymentReference,
      })

      return redirectToResult(request, {
        status: "reference-mismatch",
        reference,
      })
    }

    if (transaction.reference !== reference) {
      return redirectToResult(request, {
        status: "reference-mismatch",
        reference,
      })
    }

    if (transaction.amount !== order.amountDueKobo) {
      console.error("Payment amount mismatch.", {
        expectedAmount: order.amountDueKobo,
        receivedAmount: transaction.amount,
      })

      return redirectToResult(request, {
        status: "amount-mismatch",
        reference,
      })
    }

    if (transaction.currency.toUpperCase() !== "NGN") {
      return redirectToResult(request, {
        status: "currency-mismatch",
        reference,
      })
    }

    const transactionEmail =
      transaction.customer?.email?.trim().toLowerCase() ?? ""

    if (
      transactionEmail &&
      transactionEmail !== order.customerEmail.trim().toLowerCase()
    ) {
      return redirectToResult(request, {
        status: "customer-mismatch",
        reference,
      })
    }

    const paidOrder = {
      ...order,
      status: "paid" as const,
      paidAt: transaction.paid_at ?? new Date().toISOString(),
    }

    const response = redirectToResult(request, {
      status: "success",
      reference,
      orderId: order.id,
    })

    response.cookies.set({
      name: MOCK_ORDER_COOKIE,
      value: encodeMockOrder(paidOrder),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch (error) {
    console.error("Payment callback verification error:", error)

    return redirectToResult(request, {
      status: "verification-error",
      reference,
    })
  }
}

function redirectToResult(
  request: NextRequest,
  values: {
    status: string
    reference?: string
    orderId?: string
  }
) {
  const resultUrl = new URL("/payment/result", request.nextUrl.origin)

  resultUrl.searchParams.set("status", values.status)

  if (values.reference) {
    resultUrl.searchParams.set("reference", values.reference)
  }

  if (values.orderId) {
    resultUrl.searchParams.set("orderId", values.orderId)
  }

  return NextResponse.redirect(resultUrl)
}
