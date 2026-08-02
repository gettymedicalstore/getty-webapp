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
