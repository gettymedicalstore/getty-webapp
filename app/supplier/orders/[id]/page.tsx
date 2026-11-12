import SupplierOrderDetail from "@/features/orders/components/supplier-order-detail"
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SupplierOrderDetail orderId={id} />
}
