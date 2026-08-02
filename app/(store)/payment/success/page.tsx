import PaymentSuccessHandler from "../result/payment-success-handler"

type PaymentSuccessPageProps = {
  searchParams: Promise<{
    reference?: string
  }>
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const { reference } = await searchParams

  return <PaymentSuccessHandler reference={reference} />
}
