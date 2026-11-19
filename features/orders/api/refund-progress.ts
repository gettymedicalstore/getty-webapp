import type { ManagedOrder } from "./order-management"

type Payment = NonNullable<ManagedOrder["payments"]>[number]

export function refundStatusLabel(status: string) {
  if (status === "succeeded") return "Refund completed"
  if (status === "unknown") return "Refund confirmation pending"
  if (status === "failed" || status === "cancelled")
    return "Refund needs attention"
  return "Refund processing"
}

export function summarizeRefundProgress(
  orderStatus: ManagedOrder["status"],
  payments: Payment[]
): string | null {
  const refunds = payments.filter((payment) => payment.kind === "refund")
  const charges = payments.filter((payment) => payment.kind === "charge")
  const verifiedChargeMinor = charges
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0)

  if (!refunds.length) {
    if (orderStatus !== "cancelled") return null
    if (
      charges.some((payment) =>
        ["created", "pending", "unknown"].includes(payment.status)
      )
    )
      return "Payment confirmation pending"
    return verifiedChargeMinor > 0 ? "Refund update pending" : null
  }

  if (
    refunds.some((payment) => ["failed", "cancelled"].includes(payment.status))
  )
    return "Refund needs attention"
  if (refunds.some((payment) => payment.status === "unknown"))
    return "Refund confirmation pending"
  if (
    refunds.some((payment) => ["created", "pending"].includes(payment.status))
  )
    return "Refund processing"

  const completedMinor = refunds
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0)
  if (
    orderStatus === "cancelled" &&
    verifiedChargeMinor > 0 &&
    completedMinor >= verifiedChargeMinor
  )
    return "Full refund completed"
  if (orderStatus === "cancelled" && completedMinor < verifiedChargeMinor)
    return "Refund processing"
  return completedMinor > 0 ? "Refund completed" : null
}
