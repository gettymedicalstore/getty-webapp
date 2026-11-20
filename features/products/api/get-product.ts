import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import { getLiveProduct, getRelatedProducts } from "./live-catalog"
export const getProduct = getLiveProduct

export function productQueryOptions(slug: string) {
  return queryOptions({
    queryKey: queryKeys.products.detail(slug),
    queryFn: () => getProduct(slug),
    enabled: slug.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function relatedProductsQueryOptions(productId: string) {
  return queryOptions({
    queryKey: queryKeys.products.related(productId),
    queryFn: () => getRelatedProducts(productId),
    enabled: productId.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}
