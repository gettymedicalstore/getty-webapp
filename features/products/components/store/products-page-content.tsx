"use client"

import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, type SyntheticEvent } from "react"

import { productsQueryOptions } from "../../api/product-query-options"
import { mockProducts } from "../../data/mock-products"
import type { ProductFilters, ProductSort } from "../../types/product"
import ProductGrid from "./product-grid"
import ProductPagination from "./product-pagination"
import ProductsPageSkeleton from "./products-page-skeleton"

type ProductsPageContentProps = {
  initialFilters: ProductFilters
}

type CategoryTab = {
  id: string
  label: string
  slug?: string
  count: number
}

export default function ProductsPageContent({
  initialFilters,
}: ProductsPageContentProps) {
  /*
   * Recreate the inner component whenever URL-controlled filters change.
   * This keeps the local search input synchronised without calling
   * setState inside an effect.
   */
  const contentKey = createContentKey(initialFilters)

  return (
    <ProductsPageContentInner
      key={contentKey}
      initialFilters={initialFilters}
    />
  )
}

function ProductsPageContentInner({
  initialFilters,
}: ProductsPageContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(initialFilters.search ?? "")

  const productsQuery = useQuery(productsQueryOptions(initialFilters))

  const categoryTabs = useMemo<CategoryTab[]>(() => createCategoryTabs(), [])

  const activeCategory = initialFilters.category ?? "all"

  function updateSearchParams(
    updates: Record<string, string | number | undefined>
  ) {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key)
        continue
      }

      params.set(key, String(value))
    }

    const queryString = params.toString()

    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    })
  }

  function selectCategory(slug?: string) {
    updateSearchParams({
      category: slug,
      page: 1,
    })
  }

  function submitSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    updateSearchParams({
      search: searchValue.trim() || undefined,
      page: 1,
    })
  }

  function changeSort(sort: ProductSort) {
    updateSearchParams({
      sort,
      page: 1,
    })
  }

  function clearSearch() {
    setSearchValue("")

    updateSearchParams({
      search: undefined,
      page: 1,
    })
  }

  return (
    <section className="bg-white py-10 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-330 px-4 lg:px-6 xl:px-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="font-geist text-2xl leading-[110%] font-semibold text-[#252B37] sm:text-[32px]">
            Our Products
          </h1>

          <form
            onSubmit={submitSearch}
            className="relative w-full lg:max-w-[360px]"
          >
            <Search
              aria-hidden
              className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#717680]"
            />

            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search product"
              aria-label="Search products"
              className="focus:border-primary focus:ring-primary/10 h-11 w-full rounded-lg border border-[#D5D7DA] bg-white pr-10 pl-11 text-sm text-[#252B37] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] outline-none placeholder:text-[#A4A7AE] focus:ring-2"
            />

            {searchValue ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear product search"
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-md px-1.5 py-1 text-xs font-medium text-[#717680] transition hover:bg-[#F2F4F7] hover:text-[#252B37]"
              >
                Clear
              </button>
            ) : null}
          </form>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-b border-[#EAECF0] lg:flex-row lg:items-end lg:justify-between">
          <div
            role="tablist"
            aria-label="Product categories"
            className="flex [scrollbar-width:none] items-center gap-7 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          >
            {categoryTabs.map((category) => {
              const isActive =
                category.slug === undefined
                  ? activeCategory === "all"
                  : activeCategory === category.slug

              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectCategory(category.slug)}
                  className={`relative flex shrink-0 cursor-pointer items-center gap-2 pb-3 text-xs font-medium transition-colors sm:text-sm ${
                    isActive
                      ? "text-primary"
                      : "hover:text-primary text-[#475467]"
                  }`}
                >
                  <span>{category.label}</span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] leading-4 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-[#F2F4F7] text-[#475467]"
                    }`}
                  >
                    {category.count}
                  </span>

                  {isActive ? (
                    <span
                      aria-hidden
                      className="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          <label className="mb-3 flex shrink-0 items-center gap-2">
            <span className="text-xs font-medium text-[#717680]">Sort by:</span>

            <select
              value={initialFilters.sort ?? "newest"}
              onChange={(event) =>
                changeSort(event.target.value as ProductSort)
              }
              aria-label="Sort products"
              className="focus:border-primary h-9 cursor-pointer rounded-lg border border-[#D5D7DA] bg-white px-3 text-xs font-medium text-[#414651] outline-none"
            >
              <option value="newest">Newest</option>

              <option value="oldest">Oldest</option>

              <option value="price-low">Price: low to high</option>

              <option value="price-high">Price: high to low</option>

              <option value="trending">Trending</option>

              <option value="best-selling">Best selling</option>
            </select>
          </label>
        </div>

        <div className="mt-6">
          {productsQuery.isPending ? (
            <ProductsPageSkeleton />
          ) : productsQuery.isError ? (
            <ProductsError onRetry={() => productsQuery.refetch()} />
          ) : productsQuery.data.items.length > 0 ? (
            <>
              <ProductGrid products={productsQuery.data.items} />

              <ProductPagination pagination={productsQuery.data.pagination} />
            </>
          ) : (
            <EmptyProducts
              hasFilters={hasActiveFilters(initialFilters)}
              onReset={() => {
                setSearchValue("")
                router.push(pathname, {
                  scroll: false,
                })
              }}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function createCategoryTabs(): CategoryTab[] {
  const activeProducts = mockProducts.filter((product) => product.active)

  const categoryMap = new Map<
    string,
    {
      label: string
      count: number
    }
  >()

  for (const product of activeProducts) {
    const slug = product.category.slug
    const existing = categoryMap.get(slug)

    categoryMap.set(slug, {
      label: product.category.name,
      count: (existing?.count ?? 0) + 1,
    })
  }

  const categoryTabs = Array.from(categoryMap.entries())
    .map(([slug, category]) => ({
      id: slug,
      label: category.label,
      slug,
      count: category.count,
    }))
    .sort((first, second) => first.label.localeCompare(second.label))

  return [
    {
      id: "all",
      label: "All",
      count: activeProducts.length,
    },
    ...categoryTabs,
  ]
}

function createContentKey(filters: ProductFilters) {
  return [
    filters.search ?? "",
    filters.category ?? "",
    filters.sort ?? "",
    filters.page ?? 1,
  ].join(":")
}

function hasActiveFilters(filters: ProductFilters) {
  return Boolean(filters.search || filters.category || filters.sort)
}

function EmptyProducts({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean
  onReset: () => void
}) {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-6 text-center">
      <div>
        <h2 className="text-base font-semibold text-[#252B37]">
          No products found
        </h2>

        <p className="mt-2 text-sm text-[#667085]">
          Try changing your search or selected category.
        </p>

        {hasFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="text-primary mt-5 cursor-pointer text-sm font-semibold hover:underline"
          >
            Clear all filters
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ProductsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-xl border border-[#FECDCA] bg-[#FFFBFA] px-6 text-center">
      <div>
        <h2 className="text-base font-semibold text-[#B42318]">
          Products could not be loaded
        </h2>

        <p className="mt-2 text-sm text-[#667085]">
          Something went wrong while loading the products.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="bg-primary hover:bg-primary-darker mt-5 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
