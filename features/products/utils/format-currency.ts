export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(value)
}
