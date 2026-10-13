"use client"
import OrdersPage from "@/features/orders/components/orders-page"
export default function CustomerOrders({
  payments = false,
  embedded = false,
}: {
  payments?: boolean
  embedded?: boolean
}) {
  return (
    <OrdersPage workspace="customer" payments={payments} embedded={embedded} />
  )
}
