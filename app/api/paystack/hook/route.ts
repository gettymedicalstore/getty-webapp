import crypto from "node:crypto"
import { NextResponse } from "next/server"

import {
  findOrderByReference,
  updateOrderByReference,
} from "@/features/orders/server/order-repository"

type PaystackWebhookEvent = {
  event: string
  data: {
    id?: number
    status?: string
    amount?: number
    reference?: string
    currency?: string
    metadata?: {
      orderId?: string
      paymentType?: "full" | "installment"
    }
    subscription?: {
      subscription_code?: string
      status?: string
    }
  }
}

function isValidPaystackSignature(body: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY

  if (!secret || !signature) {
    return false
  }

  const expectedSignature = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex")

  try {
    const expected = Buffer.from(expectedSignature, "utf8")

    const received = Buffer.from(signature, "utf8")

    return (
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received)
    )
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  const signature = request.headers.get("x-paystack-signature")

  if (!isValidPaystackSignature(rawBody, signature)) {
    return NextResponse.json(
      {
        message: "Invalid webhook signature.",
      },
      {
        status: 401,
      }
    )
  }

  let payload: PaystackWebhookEvent

  try {
    payload = JSON.parse(rawBody) as PaystackWebhookEvent
  } catch {
    return NextResponse.json(
      {
        message: "Invalid webhook payload.",
      },
      {
        status: 400,
      }
    )
  }

  try {
    switch (payload.event) {
      case "charge.success": {
        await handleSuccessfulCharge(payload)
        break
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        console.warn(
          "Paystack subscription stopped:",
          payload.data.subscription
        )
        break
      }

      default: {
        console.info("Unhandled Paystack event:", payload.event)
      }
    }

    return NextResponse.json({
      received: true,
    })
  } catch (error) {
    console.error("Paystack webhook processing failed:", error)

    /*
     * A non-2xx response allows Paystack
     * to retry the webhook.
     */
    return NextResponse.json(
      {
        message: "Webhook processing failed.",
      },
      {
        status: 500,
      }
    )
  }
}

async function handleSuccessfulCharge(payload: PaystackWebhookEvent) {
  const reference = payload.data.reference?.trim()

  if (!reference) {
    console.warn("Paystack charge.success event has no reference.")
    return
  }

  const order = await findOrderByReference(reference)

  if (!order) {
    console.warn(`No order found for Paystack reference ${reference}.`)
    return
  }

  const amount = Number(payload.data.amount)

  if (!Number.isInteger(amount) || amount <= 0) {
    console.warn(`Invalid Paystack amount for reference ${reference}.`)
    return
  }

  const expectedAmount = order.expectedAmountKobo

  const isValidPayment =
    payload.data.status === "success" &&
    payload.data.currency === "NGN" &&
    amount === expectedAmount

  if (!isValidPayment) {
    console.warn("Paystack payment validation failed:", {
      reference,
      receivedStatus: payload.data.status,
      receivedCurrency: payload.data.currency,
      receivedAmount: amount,
      expectedAmount,
    })

    return
  }

  /*
   * Temporary protection for the in-memory repository.
   *
   * In production, insert the Paystack transaction ID
   * or reference into a payments table with a UNIQUE
   * constraint before updating the order.
   */
  if (order.paymentMode.type === "full" && order.paymentStatus === "paid") {
    return
  }

  const totalAmountKobo = Math.round(order.total * 100)

  const paidAmountKobo = Math.min(
    order.paidAmountKobo + amount,
    totalAmountKobo
  )

  await updateOrderByReference(reference, {
    paidAmountKobo,
    paymentStatus:
      paidAmountKobo >= totalAmountKobo ? "paid" : "partially-paid",
  })
}
