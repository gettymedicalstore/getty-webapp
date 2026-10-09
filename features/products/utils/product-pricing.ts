export function productPricing(price: number, compareAtPrice?: number | null) {
  const discounted =
    Number.isFinite(price) &&
    price >= 0 &&
    typeof compareAtPrice === "number" &&
    Number.isFinite(compareAtPrice) &&
    compareAtPrice > price
  return {
    price,
    originalPrice: discounted ? compareAtPrice : null,
    saving: discounted ? Math.round((compareAtPrice - price) * 100) / 100 : 0,
    percent: discounted
      ? Math.floor(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0,
  }
}

export function productMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}
