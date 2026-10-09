"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Package } from "lucide-react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { featuredProductsQueryOptions } from "@/features/products/api/product-query-options"
import ProductCardImage from "@/features/products/components/store/product-card-image"
import ProductPrice from "@/features/products/components/store/product-price"

export default function HeroCarousel() {
  const query = useQuery(featuredProductsQueryOptions(8))
  const products = query.data ?? []
  const [selected, setSelected] = useState(0)
  const index = products.length ? selected % products.length : 0
  const product = products[index]
  const move = (step: number) => {
    if (products.length > 1)
      setSelected(
        (current) => (current + step + products.length) % products.length
      )
  }

  return (
    <section
      className="border-b border-[#e3e9e5] bg-[#f4f7f5]"
      aria-labelledby="store-introduction"
    >
      <div className="site-container grid lg:min-h-[420px] lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col justify-center py-10 sm:py-12 lg:pr-16">
          <p className="text-xs font-semibold tracking-[.12em] text-[#52675b] uppercase">
            Getty Medical Stores
          </p>
          <h1
            id="store-introduction"
            className="mt-5 max-w-xl text-[clamp(2.25rem,4vw,3.75rem)] leading-[1.08] font-semibold tracking-[-.04em] text-[#123e2c]"
          >
            Medical essentials.
            <br />
            For every day of care.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#526158]">
            From everyday supplies to specialist equipment, find what you need
            for your clinic, practice or home.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#086b43] px-6 text-sm font-semibold text-white transition hover:bg-[#055132]"
            >
              Shop all products
            </Link>
            <Link
              href="/categories"
              className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-semibold text-[#26553e] hover:underline"
            >
              Browse categories
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <aside
          className="my-6 mt-0 w-full max-w-xl min-w-0 self-center justify-self-center overflow-hidden rounded-xl border border-[#e0e7e2] bg-white lg:my-8 lg:justify-self-end"
          aria-label="Featured products"
          aria-roledescription="carousel"
        >
          <div className="px-5 pt-5 sm:px-7">
            <h2 className="text-[11px] font-semibold tracking-[.12em] text-[#52675b] uppercase">
              Featured product
            </h2>
          </div>
          <div aria-live="polite" aria-atomic="true">
            {product ? (
              <>
                <Link
                  href={`/products/${product.slug}`}
                  aria-label={`View ${product.name}`}
                  className="group relative mx-5 my-2 block h-48 sm:mx-7 sm:h-56"
                >
                  <ProductCardImage
                    key={product.id}
                    product={product}
                    eager
                    sizes="(max-width:640px) 85vw, 480px"
                    className="p-2 sm:p-2"
                  />
                </Link>
                <div className="border-t border-[#edf0ee] px-5 pt-4 sm:px-7">
                  <p className="text-xs text-[#66736b]">
                    {product.category.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
                    <h3 className="line-clamp-2 min-w-0 flex-1 basis-40 text-lg leading-6 font-semibold text-[#252b37]">
                      {product.name}
                    </h3>
                    <ProductPrice
                      price={product.price}
                      compareAtPrice={product.compareAtPrice}
                      currency={product.currency}
                    />
                  </div>
                </div>
              </>
            ) : query.isPending ? (
              <div
                role="status"
                className="mx-5 mt-4 flex min-h-64 animate-pulse items-center justify-center bg-[#f5f7f5] motion-reduce:animate-none sm:mx-7"
              >
                <Package className="size-10 text-[#75877b]" aria-hidden />
                <span className="sr-only">Loading featured products</span>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-start justify-center px-5 sm:px-7">
                <p className="text-xl font-semibold text-[#252b37]">
                  Explore the store
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#667085]">
                  Browse medical equipment and everyday supplies by category.
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-5 sm:px-7 sm:pb-6">
            <Link
              href={product ? `/products/${product.slug}` : "/products"}
              className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md bg-[#086b43] px-4 text-sm font-semibold text-white transition hover:bg-[#055132]"
            >
              {product ? "View product" : "View all products"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {products.length > 1 && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous featured product"
                  onClick={() => move(-1)}
                  className="grid size-11 place-items-center rounded-full text-[#26553e] transition hover:bg-[#f1f5f2]"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
                <span className="min-w-8 text-center text-xs whitespace-nowrap text-[#66736b] tabular-nums">
                  {index + 1} / {products.length}
                </span>
                <button
                  type="button"
                  aria-label="Next featured product"
                  onClick={() => move(1)}
                  className="grid size-11 place-items-center rounded-full text-[#26553e] transition hover:bg-[#f1f5f2]"
                >
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
