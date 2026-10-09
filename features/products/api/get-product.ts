import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import { getLiveProduct } from "./live-catalog"
export const getProduct = getLiveProduct

export function productQueryOptions(slug: string) {
  return queryOptions({
    queryKey: queryKeys.products.detail(slug),
    queryFn: () => getProduct(slug),
    enabled: slug.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}
