export type OrderStatus =
  "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"

export type TrackedOrder = {
  orderNumber: string
  customerEmail: string
  status: OrderStatus
  createdAt: string
  estimatedDelivery?: string
  deliveryAddress: string
  timeline: Array<{
    status: OrderStatus
    label: string
    completed: boolean
    date?: string
  }>
}

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
  paystackAccessCode?: string
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
  paystackPlanCode?: string
  frequency?: "weekly" | "monthly"
  installmentCount?: number
  createdAt: string
  updatedAt: string
  paymentTransactions?: string[]
  delivery?: Record<string, string>
}
