import type { ProductFilters, ProductSort } from "../types/product"

export type ProductSearchParams = {
  cursor?: string | string[]
  navigation?: string | string[]
  page?: string | string[]
  limit?: string | string[]
  search?: string | string[]
  category?: string | string[]
  sort?: string | string[]
  minimumPrice?: string | string[]
  maximumPrice?: string | string[]
  availability?: string | string[]
}

const allowedSortValues = [
  "newest",
  "oldest",
  "price-low",
  "price-high",
  "trending",
  "best-selling",
] as const satisfies readonly ProductSort[]

export function getSingleSearchValue(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function positiveInteger(
  value: string | string[] | undefined,
  fallback: number
): number {
  const parsed = Number.parseInt(getSingleSearchValue(value) ?? "", 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nonNegativeNumber(
  value: string | string[] | undefined
): number | undefined {
  const resolvedValue = getSingleSearchValue(value)

  if (resolvedValue === undefined || resolvedValue.trim() === "") {
    return undefined
  }

  const parsed = Number(resolvedValue)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function normaliseSort(value: string | string[] | undefined): ProductSort {
  const resolvedValue = getSingleSearchValue(value)

  const matchedSort = allowedSortValues.find(
    (sortValue) => sortValue === resolvedValue
  )

  return matchedSort ?? "newest"
}

function normaliseAvailability(
  value: string | string[] | undefined
): ProductFilters["availability"] {
  const resolvedValue = getSingleSearchValue(value)

  if (resolvedValue === "in-stock" || resolvedValue === "out-of-stock") {
    return resolvedValue
  }

  return undefined
}

export function normaliseProductFilters(
  searchParams: ProductSearchParams
): ProductFilters {
  const minimumPrice = nonNegativeNumber(searchParams.minimumPrice)

  const maximumPrice = nonNegativeNumber(searchParams.maximumPrice)

  return {
    cursor:
      searchParams.cursor === undefined
        ? undefined
        : Number(getSingleSearchValue(searchParams.cursor)),
    navigation:
      getSingleSearchValue(searchParams.navigation) === "previous"
        ? "previous"
        : "next",
    page: positiveInteger(searchParams.page, 1),

    limit: Math.min(positiveInteger(searchParams.limit, 12), 48),

    search: getSingleSearchValue(searchParams.search)?.trim() || undefined,

    category: getSingleSearchValue(searchParams.category)?.trim() || undefined,

    sort: normaliseSort(searchParams.sort),

    minimumPrice,

    maximumPrice,

    availability: normaliseAvailability(searchParams.availability),
  }
}
