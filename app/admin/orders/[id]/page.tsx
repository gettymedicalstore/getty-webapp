import OperationsOrderDetail from "@/features/orders/components/operations-order-detail"
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OperationsOrderDetail orderId={id} view="orders" />
}
