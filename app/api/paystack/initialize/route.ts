import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  decodeMockSession,
  MOCK_SESSION_COOKIE,
} from "@/features/auth/server/mock-session"
import { calculateCheckout } from "@/features/checkout/server/calculate-checkout"
import type {
  CheckoutItemInput,
  CheckoutPaymentMode,
} from "@/features/checkout/types/payment"
import {
  createCheckoutOrder,
  updateOrderByReference,
} from "@/features/orders/server/order-repository"
import {
  createPaystackPlan,
  initializePaystackTransaction,
} from "@/lib/paystack/paystack"

const allowedInstallmentCounts = new Set([4, 6, 8, 10, 12, 14])

type ParsedCheckoutInput = {
  items: CheckoutItemInput[]
  paymentMode: unknown
}

export async function POST(request: Request) {
  let createdOrderReference: string | null = null

  try {
    const user = await getAuthenticatedUser()

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

    const input = await parseCheckoutInput(request)

    if (!input) {
      return NextResponse.json(
        {
          message: "The checkout request is invalid.",
        },
        {
          status: 400,
        }
      )
    }

    if (input.items.length === 0) {
      return NextResponse.json(
        {
          message: "Your cart is empty.",
        },
        {
          status: 400,
        }
      )
    }

    const paymentMode = validatePaymentMode(input.paymentMode)

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

    /*
     * All prices, stock levels and totals are recalculated on the server.
     * Never trust pricing information sent by the browser.
     */
    const checkout = calculateCheckout(input.items)

    if (!Number.isInteger(checkout.totalKobo) || checkout.totalKobo <= 0) {
      return NextResponse.json(
        {
          message: "The checkout total is invalid.",
        },
        {
          status: 400,
        }
      )
    }

    const orderId = randomUUID()
    const reference = createPaymentReference()
    const now = new Date().toISOString()

    createdOrderReference = reference

    const callbackUrl = new URL(
      "/checkout/callback",
      getApplicationUrl(request)
    )

    let planCode: string | undefined
    let expectedAmountKobo = checkout.totalKobo

    if (paymentMode.type === "installment") {
      const { frequency, installmentCount } = paymentMode

      if (!allowedInstallmentCounts.has(installmentCount)) {
        return NextResponse.json(
          {
            message: "The selected number of instalments is not supported.",
          },
          {
            status: 400,
          }
        )
      }

      /*
       * Paystack plans charge the same amount on every billing cycle.
       * The order total must divide evenly to avoid undercharging or
       * overcharging the customer.
       */
      if (checkout.totalKobo % installmentCount !== 0) {
        return NextResponse.json(
          {
            message:
              "This total cannot be divided evenly by the selected number of instalments. Select another option.",
          },
          {
            status: 400,
          }
        )
      }

      const installmentAmountKobo = checkout.totalKobo / installmentCount

      const plan = await createPaystackPlan({
        orderId,
        amountKobo: installmentAmountKobo,
        interval: frequency,
        invoiceLimit: installmentCount,
      })

      if (!plan.status || !plan.data?.plan_code) {
        throw new Error(
          plan.message || "The instalment payment plan could not be created."
        )
      }

      planCode = plan.data.plan_code
      expectedAmountKobo = installmentAmountKobo
    }

    /*
     * Save the order before initialising Paystack so that the callback
     * can resolve the order by its reference.
     */
    createCheckoutOrder({
      id: orderId,
      reference,
      customerId: user.id,
      email: user.email.trim().toLowerCase(),
      items: checkout.items,
      subtotal: checkout.subtotal,
      deliveryFee: checkout.deliveryFee,
      total: checkout.total,
      expectedAmountKobo,
      paymentMode,
      paymentStatus: "pending",
      paidAmountKobo: 0,
      paystackPlanCode: planCode,
      frequency:
        paymentMode.type === "installment" ? paymentMode.frequency : undefined,
      installmentCount:
        paymentMode.type === "installment"
          ? paymentMode.installmentCount
          : undefined,
      createdAt: now,
      updatedAt: now,
    })

    const initialized = await initializePaystackTransaction({
      email: user.email.trim().toLowerCase(),
      amountKobo: paymentMode.type === "full" ? checkout.totalKobo : undefined,
      reference,
      callbackUrl: callbackUrl.toString(),
      planCode,
      invoiceLimit:
        paymentMode.type === "installment"
          ? paymentMode.installmentCount
          : undefined,
      metadata: {
        orderId,
        customerId: user.id,
        paymentType: paymentMode.type,
        installmentCount:
          paymentMode.type === "installment"
            ? paymentMode.installmentCount
            : undefined,
        frequency:
          paymentMode.type === "installment"
            ? paymentMode.frequency
            : undefined,
      },
    })

    if (
      !initialized.status ||
      !initialized.data?.authorization_url ||
      !initialized.data.reference ||
      !initialized.data.access_code
    ) {
      throw new Error(
        initialized.message || "Paystack payment could not be initialised."
      )
    }

    const paymentData = initialized.data

    const updatedOrder = updateOrderByReference(reference, {
      paymentReference: paymentData.reference,
      paystackAccessCode: paymentData.access_code,
    })

    if (!updatedOrder) {
      throw new Error(
        "The checkout order could not be updated after Paystack initialisation."
      )
    }

    return NextResponse.json(
      {
        authorizationUrl: paymentData.authorization_url,
        reference: paymentData.reference,
        orderId,
      },
      {
        status: 200,
      }
    )
  } catch (error) {
    console.error("Paystack initialise error:", error)

    if (createdOrderReference) {
      try {
        updateOrderByReference(createdOrderReference, {
          paymentStatus: "failed",
        })
      } catch (updateError) {
        console.error("Unable to mark the failed checkout order:", updateError)
      }
    }

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
            : "Checkout could not be initialised.",
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

async function parseCheckoutInput(
  request: Request
): Promise<ParsedCheckoutInput | null> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return null
  }

  if (!isRecord(body)) {
    return null
  }

  if (!Array.isArray(body.items)) {
    return null
  }

  const items = body.items.map((item, index) => parseCheckoutItem(item, index))

  return {
    items,
    paymentMode: body.paymentMode,
  }
}

function parseCheckoutItem(value: unknown, index: number): CheckoutItemInput {
  if (!isRecord(value)) {
    throw new CheckoutValidationError(`Cart item ${index + 1} is invalid.`)
  }

  const productId =
    typeof value.productId === "string" ? value.productId.trim() : ""

  const quantity = Number(value.quantity)

  if (!productId) {
    throw new CheckoutValidationError(
      `Cart item ${index + 1} does not have a valid product ID.`
    )
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new CheckoutValidationError(
      `Cart item ${index + 1} does not have a valid quantity.`
    )
  }

  return {
    productId,
    quantity,
  }
}

function validatePaymentMode(value: unknown): CheckoutPaymentMode | null {
  if (!isRecord(value)) {
    return null
  }

  if (value.type === "full") {
    return {
      type: "full",
    }
  }

  if (
    value.type === "installment" &&
    (value.frequency === "weekly" || value.frequency === "monthly") &&
    typeof value.installmentCount === "number" &&
    Number.isInteger(value.installmentCount) &&
    allowedInstallmentCounts.has(value.installmentCount)
  ) {
    return {
      type: "installment",
      frequency: value.frequency,
      installmentCount: value.installmentCount,
    }
  }

  return null
}

function createPaymentReference() {
  const randomPart = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()

  return `GETTY-${Date.now()}-${randomPart}`
}

function getApplicationUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin
    } catch {
      throw new Error("NEXT_PUBLIC_APP_URL is not a valid absolute URL.")
    }
  }

  return new URL(request.url).origin
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CheckoutValidationError"
  }
}
