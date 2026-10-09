import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import { getLiveCategories } from "@/features/products/api/live-catalog"
export const getCategories = getLiveCategories
export async function getCategory(slug: string) {
  return (
    (await getLiveCategories()).find((c) => c.slug === slug || c.id === slug) ??
    null
  )
}

export function categoriesQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.categories.list(),
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000,
  })
}

export function categoryQueryOptions(slug: string) {
  return queryOptions({
    queryKey: queryKeys.categories.detail(slug),
    queryFn: () => getCategory(slug),
    staleTime: 10 * 60 * 1000,
  })
}
