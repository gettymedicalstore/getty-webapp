"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"

import { mockCategories } from "@/features/categories/data/mock-categories"

export default function CategoryCarousel() {
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

  return (
    <section className="overflow-hidden bg-white py-14 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-330 px-4 lg:px-6 xl:px-0">
        <div className="mb-8 flex items-center justify-between gap-6 lg:mb-10">
          <h2 className="leaing-[110%] font-inter text-2xl font-semibold tracking-normal text-[#252B37] sm:text-[32px]">
            Top Categories
          </h2>

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
        {mockCategories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            data-category-card
            className="group relative min-w-[82vw] snap-start overflow-hidden rounded-l-xl rounded-r-xl bg-[#f3f4f6] sm:min-w-[58vw] md:min-w-106"
          >
            <div className="relative aspect-[1.24/1] overflow-hidden bg-white">
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
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="font-inter bg-[#414651] px-5 py-4 text-[#FDFDFD]">
              <h3 className="text-[20px] leading-[110%] font-semibold tracking-normal capitalize">
                {category.name}
              </h3>

              <p className="font-inter text-[14px] leading-[110%] font-normal text-[#FDFDFD]">
                {category.productCount.toLocaleString()} Products
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
