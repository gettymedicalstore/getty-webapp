import type { CatalogVariant } from "@/lib/api/getty-contract"
import type { Product } from "../types/product"

// Catalog discount is the selling price. Zero means there is no promotion.
// Cart and checkout prices already include it and must not pass through this mapper.
export function catalogPricing(price: number, discount?: number | null) {
  const discounted =
    typeof discount === "number" &&
    Number.isFinite(discount) &&
    discount > 0 &&
    discount < price
  return {
    price: discounted ? discount : price,
    compareAtPrice: discounted ? price : undefined,
  }
}

export function selectProductVariant(
  product: Product,
  variant: CatalogVariant
): Product {
  return {
    ...product,
    ...catalogPricing(variant.price, variant.discount),
    variantId: variant.id,
    sku: variant.sku,
    inStock: variant.inStock,
    minimumOrderQuantity: variant.minimumOrderQuantity,
    saleUnit: variant.saleUnit,
    unitsPerPack: variant.unitsPerPack,
  }
}

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
