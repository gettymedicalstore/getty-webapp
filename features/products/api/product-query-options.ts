import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import type { ProductFilters } from "../types/product"
import {
  getFeaturedProducts,
  getProducts,
  getRecentlyAddedProducts,
} from "./get-products"

export function productsQueryOptions(filters: ProductFilters) {
  return queryOptions({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => getProducts(filters),
    staleTime: 60 * 1000,
  })
}

export function featuredProductsQueryOptions(limit = 4) {
  return queryOptions({
    queryKey: [...queryKeys.products.featured(), limit],
    queryFn: () => getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000,
  })
}

export function recentlyAddedProductsQueryOptions(limit = 4) {
  return queryOptions({
    queryKey: [...queryKeys.products.recent(), limit],
    queryFn: () => getRecentlyAddedProducts(limit),
    staleTime: 2 * 60 * 1000,
  })
}
