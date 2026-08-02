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
import type {
  CheckoutItemInput,
  CheckoutPaymentMode,
  CheckoutPaymentRequest,
} from "@/features/checkout/types/payment"

const DELIVERY_FEE_KOBO = 1800 * 100

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json(
        {
          message: "Authentication is required.",
        },
        {
          status: 401,
        }
      )
    }

    const body = await parseCheckoutRequest(request)

    if (!body) {
      return NextResponse.json(
        {
          message: "The checkout request is invalid.",
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

    const pricing = calculateCheckoutAmount(body.items)

    const amountDueKobo = calculateAmountDue(pricing.totalKobo, paymentMode)

    const orderId = crypto.randomUUID()
    const paymentReference = createPaymentReference(orderId)

    const appUrl = getApplicationUrl(request)

    const callbackUrl = new URL("/api/payment/callback", appUrl)

    const order: MockOrder = {
      id: orderId,
      customerId: user.id,
      customerEmail: user.email.trim().toLowerCase(),
      items: pricing.items,
      paymentMode,
      subtotalKobo: pricing.subtotalKobo,
      deliveryFeeKobo: pricing.deliveryFeeKobo,
      totalKobo: pricing.totalKobo,
      amountDueKobo,
      paymentReference,
      status: "pending",
      createdAt: new Date().toISOString(),
      paidAt: null,
    }

    const payment = await initializePaystackPayment({
      email: order.customerEmail,
      amountKobo: order.amountDueKobo,
      reference: paymentReference,
      callbackUrl: callbackUrl.toString(),
      metadata: {
        orderId: order.id,
        customerId: order.customerId,
        paymentType: order.paymentMode.type,
        ...(order.paymentMode.type === "installment"
          ? {
              installmentCount: order.paymentMode.installmentCount,
              frequency: order.paymentMode.frequency,
            }
          : {}),
      },
    })

    const pendingOrder: MockOrder = {
      ...order,
      paymentReference: payment.reference,
    }

    const response = NextResponse.json(
      {
        authorizationUrl: payment.authorizationUrl,
        reference: payment.reference,
        orderId: pendingOrder.id,
      },
      {
        status: 200,
      }
    )

    response.cookies.set({
      name: MOCK_ORDER_COOKIE,
      value: encodeMockOrder(pendingOrder),
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

async function getAuthenticatedUser() {
  const cookieStore = await cookies()

  return decodeMockSession(cookieStore.get(MOCK_SESSION_COOKIE)?.value)
}

async function parseCheckoutRequest(
  request: Request
): Promise<CheckoutPaymentRequest | null> {
  let value: unknown

  try {
    value = await request.json()
  } catch {
    return null
  }

  if (typeof value !== "object" || value === null) {
    return null
  }

  const body = value as Record<string, unknown>

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new CheckoutValidationError("Your cart is empty.")
  }

  const items = body.items.map(validateCheckoutItem)

  return {
    /*
     * The client may still send an email for compatibility, but the server
     * does not trust or use it. The authenticated session is authoritative.
     */
    email: typeof body.email === "string" ? body.email : "",
    items,
    paymentMode: body.paymentMode as CheckoutPaymentMode,
  }
}

function validateCheckoutItem(
  value: unknown,
  index: number
): CheckoutItemInput {
  if (typeof value !== "object" || value === null) {
    throw new CheckoutValidationError(`Cart item ${index + 1} is invalid.`)
  }

  const item = value as Record<string, unknown>

  if (
    typeof item.productId !== "string" ||
    item.productId.trim().length === 0
  ) {
    throw new CheckoutValidationError(
      `Cart item ${index + 1} has no valid product ID.`
    )
  }

  const quantity = Number(item.quantity)

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    throw new CheckoutValidationError(
      `Cart item ${index + 1} has an invalid quantity.`
    )
  }

  return {
    productId: item.productId.trim(),
    quantity,
  }
}

function calculateCheckoutAmount(items: CheckoutItemInput[]) {
  let subtotalKobo = 0

  const normalizedItems = items.map((item) => {
    const product = findMockProduct(item.productId)

    if (!product) {
      throw new CheckoutValidationError(
        `Product ${item.productId} could not be found.`
      )
    }

    if (product.stock <= 0) {
      throw new CheckoutValidationError(`${product.name} is out of stock.`)
    }

    if (item.quantity > product.stock) {
      throw new CheckoutValidationError(
        `Only ${product.stock} unit${
          product.stock === 1 ? "" : "s"
        } of ${product.name} are available.`
      )
    }

    subtotalKobo += product.priceKobo * item.quantity

    return {
      productId: product.id,
      quantity: item.quantity,
    }
  })

  const totalKobo = subtotalKobo + DELIVERY_FEE_KOBO

  return {
    items: normalizedItems,
    subtotalKobo,
    deliveryFeeKobo: DELIVERY_FEE_KOBO,
    totalKobo,
  }
}

function validatePaymentMode(value: unknown): MockPaymentMode | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const paymentMode = value as Record<string, unknown>

  if (paymentMode.type === "full") {
    return {
      type: "full",
    }
  }

  if (
    paymentMode.type === "installment" &&
    (paymentMode.frequency === "weekly" ||
      paymentMode.frequency === "monthly") &&
    typeof paymentMode.installmentCount === "number" &&
    Number.isInteger(paymentMode.installmentCount) &&
    paymentMode.installmentCount > 1
  ) {
    return {
      type: "installment",
      frequency: paymentMode.frequency,
      installmentCount: paymentMode.installmentCount,
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
      "The order total cannot be divided evenly by the selected instalment count."
    )
  }

  return totalKobo / paymentMode.installmentCount
}

function createPaymentReference(orderId: string) {
  const orderPart = orderId.replaceAll("-", "").slice(0, 12).toUpperCase()

  return `ORDER-${orderPart}-${Date.now()}`
}

function getApplicationUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL

  if (configuredUrl) {
    return configuredUrl
  }

  return new URL(request.url).origin
}

class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CheckoutValidationError"
  }
}
