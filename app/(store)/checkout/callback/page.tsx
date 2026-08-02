import { cookies } from "next/headers"

import {
  decodeMockOrder,
  MOCK_ORDER_COOKIE,
} from "@/features/checkout/server/mock-order"
import { verifyPaystackPayment } from "@/features/checkout/server/paystack"

import PaymentResult from "./payment-result"

type CheckoutCallbackPageProps = {
  searchParams: Promise<{
    reference?: string
    trxref?: string
  }>
}

type PaymentResultState = {
  successful: boolean
  title: string
  description: string
  reference?: string
}

export const dynamic = "force-dynamic"

export default async function CheckoutCallbackPage({
  searchParams,
}: CheckoutCallbackPageProps) {
  const params = await searchParams

  const reference = normaliseReference(params.reference ?? params.trxref)

  const result = await resolvePaymentResult(reference)

  return (
    <PaymentResult
      successful={result.successful}
      title={result.title}
      description={result.description}
      reference={result.reference}
    />
  )
}

async function resolvePaymentResult(
  reference?: string
): Promise<PaymentResultState> {
  if (!reference) {
    return {
      successful: false,
      title: "Payment reference missing",
      description:
        "The payment provider did not return a valid transaction reference.",
    }
  }

  try {
    const transaction = await verifyPaystackPayment(reference)

    if (transaction.status !== "success") {
      return {
        successful: false,
        title: "Payment was not confirmed",
        description:
          "Paystack did not confirm this transaction as successful. Your cart has not been cleared.",
        reference,
      }
    }

    const cookieStore = await cookies()

    const order = decodeMockOrder(cookieStore.get(MOCK_ORDER_COOKIE)?.value)

    if (!order) {
      return {
        successful: false,
        title: "Order could not be found",
        description:
          "The payment was found, but its corresponding order record could not be located.",
        reference,
      }
    }

    if (order.paymentReference !== reference) {
      console.error("Payment reference mismatch", {
        expectedReference: order.paymentReference,
        receivedReference: reference,
        orderId: order.id,
      })

      return {
        successful: false,
        title: "Payment reference mismatch",
        description:
          "The returned payment reference does not match the pending order.",
        reference,
      }
    }

    if (transaction.reference !== reference) {
      console.error("Verified transaction reference mismatch", {
        callbackReference: reference,
        transactionReference: transaction.reference,
      })

      return {
        successful: false,
        title: "Payment reference mismatch",
        description:
          "The verified transaction does not match the returned payment reference.",
        reference,
      }
    }

    const receivedAmount = Number(transaction.amount)

    if (
      !Number.isFinite(receivedAmount) ||
      receivedAmount !== order.amountDueKobo
    ) {
      console.error("Payment amount mismatch", {
        expectedAmountKobo: order.amountDueKobo,
        receivedAmountKobo: transaction.amount,
        orderId: order.id,
      })

      return {
        successful: false,
        title: "Payment amount mismatch",
        description:
          "The amount received does not match the expected amount for this order.",
        reference,
      }
    }

    if (transaction.currency?.toUpperCase() !== "NGN") {
      console.error("Payment currency mismatch", {
        expectedCurrency: "NGN",
        receivedCurrency: transaction.currency,
        orderId: order.id,
      })

      return {
        successful: false,
        title: "Payment currency mismatch",
        description: "The payment was completed using an unexpected currency.",
        reference,
      }
    }

    const transactionEmail =
      transaction.customer?.email?.trim().toLowerCase() ?? ""

    const orderEmail = order.customerEmail.trim().toLowerCase()

    if (transactionEmail && transactionEmail !== orderEmail) {
      console.error("Payment customer mismatch", {
        expectedEmail: orderEmail,
        receivedEmail: transactionEmail,
        orderId: order.id,
      })

      return {
        successful: false,
        title: "Customer details do not match",
        description:
          "The verified payment belongs to a different customer account.",
        reference,
      }
    }

    return {
      successful: true,
      title: "Payment successful",
      description:
        order.paymentMode.type === "installment"
          ? "Your instalment payment has been confirmed and your order is being processed."
          : "Your payment has been confirmed and your order is being processed.",
      reference,
    }
  } catch (error) {
    console.error("Checkout callback verification error:", error)

    return {
      successful: false,
      title: "Payment could not be verified",
      description:
        "We could not confirm the transaction. Your cart has not been cleared.",
      reference,
    }
  }
}

function normaliseReference(value: string | undefined) {
  const reference = value?.trim()

  return reference || undefined
}
