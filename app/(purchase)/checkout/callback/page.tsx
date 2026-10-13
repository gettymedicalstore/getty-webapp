import PaymentReturn from "@/features/checkout/components/payment-return"
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams
  return <PaymentReturn order={order} />
}
