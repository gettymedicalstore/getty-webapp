"use client"

import { useQuery } from "@tanstack/react-query"

import { relatedProductsQueryOptions } from "../../api/get-product"
import ProductGrid from "./product-grid"

export default function RelatedProducts({ productId }: { productId: string }) {
  const query = useQuery(relatedProductsQueryOptions(productId))

  if (query.isError || (query.isSuccess && query.data.length === 0)) return null

  return (
    <section className="mt-8" aria-labelledby="related-products-heading">
      <h2
        id="related-products-heading"
        className="text-xl font-semibold text-[#252B37] sm:text-2xl"
      >
        Related products
      </h2>
      {query.isPending ? (
        <div
          role="status"
          aria-label="Loading related products"
          className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-xl border border-[#e2e5eb] bg-white motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <ProductGrid products={query.data} />
        </div>
      )}
    </section>
  )
}
