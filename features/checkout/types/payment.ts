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

export type PaystackInitializeData = {
  authorization_url: string
  access_code: string
  reference: string
}

export type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: PaystackInitializeData
}

export type PaystackPaymentMetadata = {
  orderId?: string
  customerId?: string
  paymentType?: "full" | "installment"
  installmentCount?: number
  frequency?: PaymentFrequency
}

export type PaystackCustomer = {
  id?: number
  first_name?: string | null
  last_name?: string | null
  email?: string
  customer_code?: string
  phone?: string | null
  metadata?: unknown
  risk_action?: string
}

export type PaystackPlan = {
  plan_code?: string
  name?: string
}

export type PaystackVerifyData = {
  id: number
  domain?: string
  status: string
  reference: string
  receipt_number?: string | null
  amount: number
  message?: string | null
  gateway_response?: string
  paid_at: string | null
  created_at?: string
  channel?: string
  currency: string
  ip_address?: string | null
  metadata?: PaystackPaymentMetadata | string | null
  customer?: PaystackCustomer
  plan?: PaystackPlan | null
  fees?: number | null
  fees_split?: unknown
  authorization?: {
    authorization_code?: string
    bin?: string
    last4?: string
    exp_month?: string
    exp_year?: string
    channel?: string
    card_type?: string
    bank?: string
    country_code?: string
    brand?: string
    reusable?: boolean
    signature?: string
    account_name?: string | null
  }
}

export type PaystackVerifyResponse = {
  status: boolean
  message: string
  data?: PaystackVerifyData
}
