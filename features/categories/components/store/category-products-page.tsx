"use client"

import { useQuery } from "@tanstack/react-query"

import { productsQueryOptions } from "@/features/products/api/product-query-options"
import ProductGrid from "@/features/products/components/store/product-grid"
import ProductPagination from "@/features/products/components/store/product-pagination"
import ProductsPageSkeleton from "@/features/products/components/store/products-page-skeleton"
import type { ProductFilters } from "@/features/products/types/product"

import { categoryQueryOptions } from "../../api/category-query-options"

export default function CategoryProductsPage({
  slug,
  initialFilters,
}: {
  slug: string
  initialFilters: ProductFilters
}) {
  const categoryQuery = useQuery(categoryQueryOptions(slug))
  const productsQuery = useQuery(productsQueryOptions(initialFilters))

  if (!categoryQuery.data) {
    return null
  }

  return (
    <section className="bg-[#f7f7f7] py-12 sm:py-16">
      <div className="site-container">
        <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
          Product category
        </p>

        <h1 className="mt-2 text-3xl font-extrabold">
          {categoryQuery.data.name}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-black/50">
          {categoryQuery.data.description}
        </p>

        <div className="mt-8">
          {productsQuery.isPending ? (
            <ProductsPageSkeleton />
          ) : productsQuery.isError ? (
            <div className="rounded-xl bg-white px-6 py-16 text-center">
              Products could not be loaded.
            </div>
          ) : (
            <>
              <ProductGrid products={productsQuery.data.items} />

              <ProductPagination pagination={productsQuery.data.pagination} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
