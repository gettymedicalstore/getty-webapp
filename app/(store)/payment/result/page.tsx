import PaymentResultError from "./payment-result-error"
import PaymentSuccessHandler from "./payment-success-handler"

type PaymentResultPageProps = {
  searchParams: Promise<{
    status?: string
    reference?: string
    orderId?: string
  }>
}

export default async function PaymentResultPage({
  searchParams,
}: PaymentResultPageProps) {
  const { status, reference, orderId } = await searchParams

  if (status === "success") {
    return <PaymentSuccessHandler reference={reference} orderId={orderId} />
  }

  const error = getPaymentError(status)

  return (
    <PaymentResultError
      title={error.title}
      description={error.description}
      reference={reference}
    />
  )
}

function getPaymentError(status?: string) {
  switch (status) {
    case "missing-reference":
      return {
        title: "Payment reference missing",
        description:
          "The payment provider did not return a transaction reference.",
      }

    case "order-not-found":
      return {
        title: "Order could not be found",
        description:
          "The payment exists, but its order record could not be located.",
      }

    case "order-mismatch":
      return {
        title: "Order details do not match",
        description:
          "The payment was verified, but it does not match the pending order.",
      }

    case "reference-mismatch":
      return {
        title: "Payment reference mismatch",
        description:
          "The returned payment reference does not match the pending order.",
      }

    case "amount-mismatch":
      return {
        title: "Payment amount mismatch",
        description:
          "The amount received does not match the expected order amount.",
      }

    case "currency-mismatch":
      return {
        title: "Payment currency mismatch",
        description: "The payment was completed using an unexpected currency.",
      }

    case "customer-mismatch":
      return {
        title: "Customer details do not match",
        description: "The verified payment belongs to a different customer.",
      }

    case "payment-failed":
      return {
        title: "Payment was not successful",
        description:
          "The payment provider did not confirm this transaction as successful.",
      }

    default:
      return {
        title: "Payment could not be verified",
        description:
          "We could not confirm the transaction. Your cart has not been cleared.",
      }
  }
}
