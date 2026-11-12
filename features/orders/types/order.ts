import type { CheckoutPaymentMode } from "@/features/checkout/types/payment"

export type OrderPaymentStatus =
  "pending" | "partially-paid" | "paid" | "failed"

export type CheckoutOrderItem = {
  productId: string
  quantity: number
  name?: string
  unitPrice?: number
}

export type CheckoutOrder = {
  id: string
  reference: string
  paymentReference?: string
  customerId?: string
  email: string
  items: CheckoutOrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  expectedAmountKobo: number
  paymentMode: CheckoutPaymentMode
  paymentStatus: OrderPaymentStatus
  paidAmountKobo: number
  frequency?: "weekly" | "monthly"
  installmentCount?: number
  createdAt: string
  updatedAt: string
  paymentTransactions?: string[]
  delivery?: Record<string, string>
}
