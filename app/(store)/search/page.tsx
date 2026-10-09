import { serverProducts } from "@/features/products/server/catalog-service"
import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { productsQueryOptions } from "@/features/products/api/product-query-options"
import SearchResultsPage from "@/features/products/components/store/search-results-page"
import type {
  ProductFilters,
  ProductSort,
} from "@/features/products/types/product"
import { getQueryClient } from "@/lib/query/get-query-client"

export const metadata: Metadata = {
  title: "Search Products",
  description: "Search medical products and healthcare supplies.",
}

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[]
    page?: string | string[]
    sort?: string | string[]
    category?: string | string[]
  }>
}

const productSortValues = [
  "newest",
  "oldest",
  "price-low",
  "price-high",
  "trending",
  "best-selling",
] as const satisfies readonly ProductSort[]

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams

  const query = getSingleValue(resolvedSearchParams.q)?.trim() ?? ""

  const page = getPositiveInteger(resolvedSearchParams.page, 1)

  const sort =
    getProductSort(getSingleValue(resolvedSearchParams.sort)) ?? "newest"

  const category =
    getSingleValue(resolvedSearchParams.category)?.trim() || undefined

  const filters: ProductFilters = {
    search: query || undefined,
    page,
    limit: 12,
    sort,
    category,
  }

  const queryClient = getQueryClient()

  if (query) {
    await queryClient.prefetchQuery({
      ...productsQueryOptions(filters),
      queryFn: () => serverProducts(filters),
    })
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SearchResultsPage query={query} initialFilters={filters} />
    </HydrationBoundary>
  )
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getPositiveInteger(
  value: string | string[] | undefined,
  fallback: number
) {
  const parsedValue = Number.parseInt(getSingleValue(value) ?? "", 10)

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback
}

function getProductSort(value: string | undefined): ProductSort | undefined {
  if (!value) {
    return undefined
  }

  return productSortValues.find((sortValue) => sortValue === value)
}
