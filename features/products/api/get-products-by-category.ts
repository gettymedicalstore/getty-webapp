import { mockProducts } from "../data/mock-products"
import type { Product } from "../types/product"

export function filterProductsByCategory(
  slug: string,
  products: Product[] = mockProducts
) {
  const normalizedSlug = slug.trim().toLowerCase()

  if (!normalizedSlug) {
    return []
  }

  return products.filter(
    (product) =>
      product.active && product.category.slug.toLowerCase() === normalizedSlug
  )
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  return filterProductsByCategory(slug)
}
