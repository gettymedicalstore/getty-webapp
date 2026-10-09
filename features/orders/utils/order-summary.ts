export type SummaryOrder = {
  paymentStatus?: unknown
  total?: unknown
  currency?: unknown
}
export function summarizeOrders(orders: SummaryOrder[]) {
  const statuses = orders.map((order) => order.paymentStatus)
  const known = statuses.every(
    (status) =>
      typeof status === "string" &&
      ["pending", "partially-paid", "paid", "failed"].includes(status)
  )
  const currencies = new Set(orders.map((order) => order.currency ?? "NGN"))
  const currency = currencies.size <= 1 ? ([...currencies][0] ?? "NGN") : null
  const validCurrency =
    typeof currency === "string" && /^[A-Z]{3}$/.test(currency)
  const validAmounts = orders.every(
    (order) =>
      typeof order.total === "number" &&
      Number.isFinite(order.total) &&
      order.total >= 0
  )
  return {
    count: orders.length,
    awaitingPayment: known
      ? statuses.filter(
          (status) => status === "pending" || status === "partially-paid"
        ).length
      : null,
    paid: known ? statuses.filter((status) => status === "paid").length : null,
    failed: known
      ? statuses.filter((status) => status === "failed").length
      : null,
    value:
      validAmounts && validCurrency
        ? orders.reduce((sum, order) => sum + (order.total as number), 0)
        : null,
    currency: validCurrency ? currency : null,
  }
}
