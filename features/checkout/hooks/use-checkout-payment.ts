"use client"

import { useMutation } from "@tanstack/react-query"

import type {
  CheckoutPaymentRequest,
  CheckoutPaymentResponse,
} from "../types/payment"

type CheckoutErrorResponse = {
  message?: string
}

export function useCheckoutPayment() {
  return useMutation<CheckoutPaymentResponse, Error, CheckoutPaymentRequest>({
    mutationFn: async (payload) => {
      const response = await fetch("/api/checkout/payment", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await parseCheckoutResponse(response)

      if (!response.ok) {
        throw new Error(result.message || "Checkout could not be started.")
      }

      if (!result.authorizationUrl || !result.reference || !result.orderId) {
        throw new Error("The checkout response is incomplete.")
      }

      return {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        orderId: result.orderId,
      }
    },

    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl)
    },
  })
}

async function parseCheckoutResponse(
  response: Response
): Promise<Partial<CheckoutPaymentResponse & CheckoutErrorResponse>> {
  const contentType = response.headers.get("content-type")

  if (!contentType?.includes("application/json")) {
    const text = await response.text()

    throw new Error(text || "The checkout server returned an invalid response.")
  }

  try {
    return (await response.json()) as Partial<
      CheckoutPaymentResponse & CheckoutErrorResponse
    >
  } catch {
    throw new Error("The checkout server returned invalid JSON.")
  }
}
