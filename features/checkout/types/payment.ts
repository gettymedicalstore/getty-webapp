export type PaymentFrequency = "weekly" | "monthly"

export type CheckoutPaymentMode =
  | {
      type: "full"
    }
  | {
      type: "installment"
      frequency: PaymentFrequency
      installmentCount: number
    }

export type CheckoutItemInput = {
  productId: string
  quantity: number
}

export type CheckoutPaymentRequest = {
  email: string
  delivery?: import("../schemas/checkout-schema").CheckoutFormSchema
  items: CheckoutItemInput[]
  paymentMode: CheckoutPaymentMode
}

export type CheckoutPaymentResponse = {
  authorizationUrl: string
  reference: string
  orderId: string
}

/**
 * Optional compatibility alias.
 *
 * Keep this only when other parts of the application still import
 * InitializeCheckoutInput.
 */
export type InitializeCheckoutInput = CheckoutPaymentRequest
