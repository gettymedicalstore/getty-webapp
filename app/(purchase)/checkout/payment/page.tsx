import PaymentReturn from "@/features/checkout/components/payment-return"

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; continue?: string }>
}) {
  const { order, continue: shouldContinue } = await searchParams
  return (
    <PaymentReturn
      order={order}
      autoContinue={shouldContinue === "1"}
      returnPage={false}
    />
  )
}
