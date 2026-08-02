import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import { mockProducts } from "../data/mock-products"
import type { Product } from "../types/product"

export async function getProduct(slug: string): Promise<Product | null> {
  const normalizedSlug = slug.trim().toLowerCase()

  return (
    mockProducts.find(
      (product) =>
        product.slug.toLowerCase() === normalizedSlug && product.active
    ) ?? null
  )
}

export function productQueryOptions(slug: string) {
  return queryOptions({
    queryKey: queryKeys.products.detail(slug),
    queryFn: () => getProduct(slug),
    enabled: slug.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}
