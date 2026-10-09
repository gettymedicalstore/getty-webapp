"use client"

import { useQuery } from "@tanstack/react-query"

import { productsQueryOptions } from "../../api/product-query-options"
import type { ProductFilters } from "../../types/product"
import ProductGrid from "./product-grid"
import ProductPagination from "./product-pagination"
import ProductsPageSkeleton from "./products-page-skeleton"

export default function SearchResultsPage({
  query,
  initialFilters,
}: {
  query: string
  initialFilters: ProductFilters
}) {
  const productsQuery = useQuery({
    ...productsQueryOptions(initialFilters),
    enabled: Boolean(query),
  })

  return (
    <section className="bg-[#f7f7f7] py-12 sm:py-16">
      <div className="site-container">
        <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
          Product search
        </p>

        <h1 className="mt-2 text-3xl font-extrabold">
          {query ? `Results for “${query}”` : "Search our products"}
        </h1>

        {!query ? (
          <div className="mt-8 rounded-xl bg-white px-6 py-16 text-center">
            <p className="text-sm text-black/50">
              Enter a product name, category, or SKU.
            </p>
          </div>
        ) : productsQuery.isPending ? (
          <div className="mt-8">
            <ProductsPageSkeleton />
          </div>
        ) : productsQuery.isError ? (
          <div className="mt-8 rounded-xl bg-white px-6 py-16 text-center">
            Search failed.
          </div>
        ) : (
          <div className="mt-8">
            <p className="mb-5 text-sm text-[#5e6f63]">
              {productsQuery.data.pagination.mode === "cursor"
                ? "Products matching your search"
                : `${productsQuery.data.pagination.total} results found`}
            </p>

            <ProductGrid products={productsQuery.data.items} />

            <ProductPagination pagination={productsQuery.data.pagination} />
          </div>
        )}
      </div>
    </section>
  )
}
