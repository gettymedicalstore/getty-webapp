"use client"

import { useHydrated } from "@/lib/use-hydrated"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadingRegion } from "@/components/shared/loading-skeletons"
import { ArrowLeft, ArrowRight, Layers3 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"

import { useQuery } from "@tanstack/react-query"
import { categoriesQueryOptions } from "@/features/categories/api/category-query-options"

export default function CategoryCarousel() {
  const hydrated = useHydrated()
  const categories = useQuery(categoriesQueryOptions())
  const containerRef = useRef<HTMLDivElement>(null)

  function scroll(direction: "left" | "right") {
    const container = containerRef.current

    if (!container) return

    const firstCard = container.querySelector<HTMLElement>(
      "[data-category-card]"
    )
    const cardWidth = firstCard?.offsetWidth ?? 380

    container.scrollBy({
      left: direction === "left" ? -(cardWidth + 20) : cardWidth + 20,
      behavior: "smooth",
    })
  }

  if (hydrated && categories.isError) return null
  if (!hydrated || categories.isPending)
    return (
      <LoadingRegion
        label="Loading categories"
        className="site-container py-12"
      >
        <Skeleton className="mb-7 h-8 w-56" />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={i === 2 ? "hidden md:block" : ""}>
              <Skeleton className="aspect-[1.5/1] rounded-2xl" />
              <Skeleton className="mt-4 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </LoadingRegion>
    )
  return (
    <section className="overflow-hidden bg-white py-14 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-330 px-4 lg:px-6 xl:px-0">
        <div className="mb-8 flex items-center justify-between gap-6 lg:mb-10">
          <h2 className="section-heading">Shop by category</h2>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Previous categories"
              className="bg-primary text-primary-foreground hover:bg-primary-darker grid size-10 cursor-pointer place-items-center rounded-full transition"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Next categories"
              className="grid size-11 cursor-pointer place-items-center rounded-full bg-[#F5F5F5] text-[#475467] transition hover:bg-[#e7e7e9]"
            >
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="scrollbar:none flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[calc((100vw-min(100vw,80rem))/2+1rem)] pb-2 sm:px-[calc((100vw-min(100vw,80rem))/2+1.5rem)] lg:px-[calc((100vw-min(100vw,80rem))/2+2rem)] [&::-webkit-scrollbar]:hidden"
      >
        {(categories.data ?? []).map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            data-category-card
            className="group relative min-w-[75vw] snap-start overflow-hidden rounded-2xl border border-[#e1e8d9] bg-white sm:min-w-[58vw] md:min-w-80"
          >
            <div className="relative aspect-[1.5/1] overflow-hidden bg-[#f4f7ef]">
              {category.image === "/images/product-placeholder.svg" ? (
                <div className="grid h-full place-items-center">
                  <Layers3 className="size-14 text-[#aec49a]" strokeWidth={1} />
                </div>
              ) : (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="
                  (max-width: 640px) 82vw,
                  (max-width: 768px) 58vw,
                  (max-width: 1024px) 45vw,
                  380px
                "
                  className="object-contain p-7 transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>

            <div className="bg-white px-5 py-5 text-[#38542f]">
              <h3 className="text-base leading-6 font-semibold tracking-tight">
                {category.name}
              </h3>

              <p className="mt-1 text-xs leading-5 text-[#68765c]">
                {category.countKnown === false
                  ? "Browse products"
                  : `${category.productCount.toLocaleString()} Products`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
