import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import { mockCategories } from "../data/mock-categories"
import type { Category } from "../types/category"

export async function getCategories(): Promise<Category[]> {
  return mockCategories.filter((category) => category.active)
}

export async function getCategory(slug: string): Promise<Category | null> {
  return (
    mockCategories.find(
      (category) => category.slug === slug && category.active
    ) ?? null
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
