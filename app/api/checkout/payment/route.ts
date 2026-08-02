import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  decodeMockSession,
  MOCK_SESSION_COOKIE,
} from "@/features/auth/server/mock-session"
import {
  encodeMockOrder,
  MOCK_ORDER_COOKIE,
  type MockOrder,
  type MockPaymentMode,
} from "@/features/checkout/server/mock-order"
import { findMockProduct } from "@/features/checkout/server/mock-products"
import { initializePaystackPayment } from "@/features/checkout/server/paystack"
import type { CheckoutPaymentRequest } from "@/features/checkout/types/payment"

const DELIVERY_FEE_KOBO = 1800 * 100

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()

    const user = decodeMockSession(cookieStore.get(MOCK_SESSION_COOKIE)?.value)

    if (!user) {
      return NextResponse.json(
        {
          message: "You must be logged in before checking out.",
        },
        {
          status: 401,
        }
      )
    }

    const body = (await request.json()) as Partial<CheckoutPaymentRequest>

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          message: "Your cart is empty.",
        },
        {
          status: 400,
        }
      )
    }

    const paymentMode = validatePaymentMode(body.paymentMode)

    if (!paymentMode) {
      return NextResponse.json(
        {
          message: "The selected payment option is invalid.",
        },
        {
          status: 400,
        }
      )
    }

    let subtotalKobo = 0

    const orderItems = body.items.map((item) => {
      if (!item || typeof item.productId !== "string" || !item.productId) {
        throw new CheckoutValidationError("A cart item is invalid.")
      }

      const product = findMockProduct(item.productId)

      if (!product) {
        throw new CheckoutValidationError(
          `Product ${item.productId} could not be found.`
        )
      }

      const quantity = getValidQuantity(item.quantity)

      if (product.stock < quantity) {
        throw new CheckoutValidationError(
          `${product.name} does not have enough stock.`
        )
      }

      subtotalKobo += product.priceKobo * quantity

      return {
        productId: product.id,
        quantity,
      }
    })

    const totalKobo = subtotalKobo + DELIVERY_FEE_KOBO

    const amountDueKobo = calculateAmountDue(totalKobo, paymentMode)

    const orderId = crypto.randomUUID()
    const paymentReference = createPaymentReference(orderId)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured.")
    }

    const callbackUrl = new URL("/api/payment/callback", appUrl)

    const order: MockOrder = {
      id: orderId,
      customerId: user.id,
      customerEmail: user.email.trim().toLowerCase(),
      items: orderItems,
      paymentMode,
      subtotalKobo,
      deliveryFeeKobo: DELIVERY_FEE_KOBO,
      totalKobo,
      amountDueKobo,
      paymentReference,
      status: "pending",
      createdAt: new Date().toISOString(),
      paidAt: null,
    }

    const payment = await initializePaystackPayment({
      email: order.customerEmail,
      amountKobo: amountDueKobo,
      reference: paymentReference,
      callbackUrl: callbackUrl.toString(),
      metadata: {
        orderId: order.id,
        customerId: order.customerId,
        paymentType: paymentMode.type,
      },
    })

    order.paymentReference = payment.reference

    const response = NextResponse.json({
      authorizationUrl: payment.authorizationUrl,
      reference: payment.reference,
      orderId: order.id,
    })

    response.cookies.set({
      name: MOCK_ORDER_COOKIE,
      value: encodeMockOrder(order),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch (error) {
    console.error("Checkout initialization error:", error)

    if (error instanceof CheckoutValidationError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Checkout could not be initialized.",
      },
      {
        status: 500,
      }
    )
  }
}

function getValidQuantity(value: number) {
  const quantity = Number(value)

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new CheckoutValidationError(
      "The selected product quantity is invalid."
    )
  }

  return Math.floor(quantity)
}

function validatePaymentMode(value: unknown): MockPaymentMode | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const mode = value as Record<string, unknown>

  if (mode.type === "full") {
    return {
      type: "full",
    }
  }

  if (
    mode.type === "installment" &&
    (mode.frequency === "weekly" || mode.frequency === "monthly") &&
    typeof mode.installmentCount === "number" &&
    Number.isInteger(mode.installmentCount) &&
    mode.installmentCount > 1
  ) {
    return {
      type: "installment",
      frequency: mode.frequency,
      installmentCount: mode.installmentCount,
    }
  }

  return null
}

function calculateAmountDue(totalKobo: number, paymentMode: MockPaymentMode) {
  if (paymentMode.type === "full") {
    return totalKobo
  }

  if (totalKobo % paymentMode.installmentCount !== 0) {
    throw new CheckoutValidationError(
      "The amount cannot be divided evenly by the selected instalment count."
    )
  }

  return totalKobo / paymentMode.installmentCount
}

function createPaymentReference(orderId: string) {
  const safeOrderId = orderId.replaceAll("-", "").slice(0, 12)

  return `ORDER-${safeOrderId}-${Date.now()}`
}

class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CheckoutValidationError"
  }
}
