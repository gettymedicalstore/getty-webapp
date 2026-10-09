"use client"

import ContentError from "@/components/shared/content-error"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"

import {
  featuredProductsQueryOptions,
  productsQueryOptions,
  recentlyAddedProductsQueryOptions,
} from "../../api/product-query-options"
import type { Product, ProductSort } from "../../types/product"
import ProductCard from "./product-card"
import ProductsPageSkeleton from "./products-page-skeleton"

type ProductTab = {
  id: string
  label: string
  sort: ProductSort
}

const productTabs = [
  {
    id: "all",
    label: "All",
    sort: "newest",
  },
  {
    id: "newest",
    label: "Newest",
    sort: "newest",
  },
  {
    id: "trending",
    label: "Trending",
    sort: "trending",
  },
  {
    id: "best-sellers",
    label: "Best Sellers",
    sort: "best-selling",
  },
] satisfies readonly ProductTab[]

export function FeaturedProductsSection() {
  const query = useQuery(featuredProductsQueryOptions(8))

  return <ProductRailSection title="Featured Products" query={query} />
}

export function RecentlyAddedProductsSection() {
  const query = useQuery(recentlyAddedProductsQueryOptions(8))

  const railRef = useRef<HTMLDivElement>(null)

  function scrollProducts(direction: "previous" | "next") {
    const rail = railRef.current

    if (!rail) return

    const firstProduct = rail.querySelector<HTMLElement>(
      "[data-recent-product]"
    )

    const productWidth = firstProduct?.offsetWidth ?? 300

    const styles = window.getComputedStyle(rail)
    const gap = Number.parseFloat(styles.columnGap) || 20

    rail.scrollBy({
      left: direction === "next" ? productWidth + gap : -(productWidth + gap),
      behavior: "smooth",
    })
  }

  return (
    <section className="overflow-hidden bg-white py-12 sm:py-14 lg:py-16">
      <div className="site-container">
        <div className="mb-7 flex items-center justify-between gap-6">
          <h2 className="section-heading">Recently Added</h2>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => scrollProducts("previous")}
              aria-label="Previous recently added products"
              className="bg-primary hover:bg-primary-darker grid size-8 cursor-pointer place-items-center rounded-full text-white transition-colors"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollProducts("next")}
              aria-label="Next recently added products"
              className="grid size-8 cursor-pointer place-items-center rounded-full bg-[#F5F5F5] text-[#475467] transition-colors hover:bg-[#E7E7E9]"
            >
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        {query.isPending ? (
          <ProductsPageSkeleton />
        ) : query.isError ? (
          <ProductSectionError />
        ) : query.data?.length ? (
          <div
            ref={railRef}
            className="grid snap-x snap-mandatory scrollbar-none auto-cols-[100%] grid-flow-col gap-6 overflow-x-auto scroll-smooth pb-2 sm:auto-cols-[calc((100%-24px)/2)] lg:auto-cols-[calc((100%-72px)/4)] [&::-webkit-scrollbar]:hidden"
          >
            {query.data.map((product) => (
              <div
                key={product.id}
                data-recent-product
                className="min-w-0 snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyProductSection />
        )}
      </div>
    </section>
  )
}
export function OurProductsSection() {
  const [activeTab, setActiveTab] = useState<ProductTab>(productTabs[0])

  const query = useQuery(
    productsQueryOptions({
      page: 1,
      limit: 8,
      sort: activeTab.sort,
    })
  )

  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20">
      <div className="site-container">
        <div className="flex items-center justify-between gap-6">
          <h2 className="section-heading">Our Products</h2>

          <Link
            href="/products"
            className="text-primary hover:text-primary-darker shrink-0 text-sm font-semibold transition-colors"
          >
            View all products
          </Link>
        </div>

        <div className="mt-5 border-b border-[#EAECF0]">
          <div
            role="tablist"
            aria-label="Product filters"
            className="flex [scrollbar-width:none] items-center gap-7 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          >
            {productTabs
              .filter(
                (tab) =>
                  query.data?.pagination.mode !== "cursor" ||
                  tab.sort === "newest"
              )
              .map((tab) => {
                const isActive = activeTab.id === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab)}
                    className={`relative shrink-0 cursor-pointer pb-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary"
                        : "hover:text-primary text-[#475467]"
                    }`}
                  >
                    {tab.label}

                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                      />
                    ) : null}
                  </button>
                )
              })}
          </div>
        </div>

        <div className="mt-6">
          {query.isPending ? (
            <ProductsPageSkeleton />
          ) : query.isError ? (
            <ProductSectionError />
          ) : (
            <ProductGrid products={query.data?.items ?? []} />
          )}
        </div>
      </div>
    </section>
  )
}

type ProductRailSectionProps = {
  title: string
  query: {
    isPending: boolean
    isError: boolean
    data: Product[] | undefined
  }
}

function ProductRailSection({ title, query }: ProductRailSectionProps) {
  return (
    <section className="overflow-hidden bg-white py-14 sm:py-16 lg:py-20">
      <div className="site-container">
        {query.isPending ? (
          <>
            <SectionHeading title={title} />
            <ProductsPageSkeleton />
          </>
        ) : query.isError ? (
          <>
            <SectionHeading title={title} />
            <ProductSectionError />
          </>
        ) : (
          <ProductRail title={title} products={query.data ?? []} />
        )}
      </div>
    </section>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="section-heading">{title}</h2>
    </div>
  )
}

function ProductRail({
  title,
  products,
}: {
  title: string
  products: Product[]
}) {
  const railRef = useRef<HTMLDivElement>(null)

  function scrollProducts(direction: "previous" | "next") {
    const rail = railRef.current

    if (!rail) return

    const firstProduct = rail.querySelector<HTMLElement>("[data-product-card]")

    const productWidth = firstProduct?.offsetWidth ?? 300

    const styles = window.getComputedStyle(rail)
    const gap = Number.parseFloat(styles.columnGap) || 20

    rail.scrollBy({
      left: direction === "next" ? productWidth + gap : -(productWidth + gap),
      behavior: "smooth",
    })
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-6">
        <h2 className="section-heading">{title}</h2>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => scrollProducts("previous")}
            aria-label={`Previous ${title.toLowerCase()} products`}
            className="bg-primary text-primary-foreground hover:bg-primary-darker grid size-10 cursor-pointer place-items-center rounded-full transition-colors"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>

          <button
            type="button"
            onClick={() => scrollProducts("next")}
            aria-label={`Next ${title.toLowerCase()} products`}
            className="grid size-10 cursor-pointer place-items-center rounded-full bg-[#F5F5F5] text-[#475467] transition-colors hover:bg-[#E7E7E9]"
          >
            <ArrowRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyProductSection />
      ) : (
        <div
          ref={railRef}
          className="grid snap-x snap-mandatory [scrollbar-width:none] auto-cols-[100%] grid-flow-col gap-6 overflow-x-auto scroll-smooth pb-2 sm:auto-cols-[calc((100%-24px)/2)] lg:auto-cols-[calc((100%-72px)/4)] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <div
              key={product.id}
              data-product-card
              className="min-w-0 snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <EmptyProductSection />
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function EmptyProductSection() {
  return (
    <div className="flex min-h-60 items-center justify-center rounded-xl border border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-6 text-center">
      <div>
        <h3 className="text-base font-semibold text-[#252B37]">
          No products available
        </h3>

        <p className="mt-2 text-sm text-[#667085]">
          Products will appear here when they become available.
        </p>
      </div>
    </div>
  )
}

function ProductSectionError() {
  return (
    <ContentError
      title="Products will be back shortly"
      description="We’re having trouble connecting to the store. Please try again in a moment."
    />
  )
}
