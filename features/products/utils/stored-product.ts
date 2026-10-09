import type { Product } from "../types/product"
export function isStoredProduct(value: unknown): value is Product {
  if (typeof value !== "object" || !value) return false
  const p = value as Partial<Product>
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.slug === "string" &&
    typeof p.description === "string" &&
    typeof p.image === "string" &&
    typeof p.price === "number" &&
    Number.isFinite(p.price) &&
    p.price >= 0 &&
    typeof p.stock === "number" &&
    Number.isSafeInteger(p.stock) &&
    p.stock >= 0 &&
    typeof p.active === "boolean" &&
    typeof p.createdAt === "string" &&
    typeof p.category === "object" &&
    p.category !== null &&
    typeof p.category.id === "string" &&
    typeof p.category.name === "string" &&
    typeof p.category.slug === "string"
  )
}
