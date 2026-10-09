"use client"
import { useHydrated } from "@/lib/use-hydrated"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Layers3 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { categoriesQueryOptions } from "../../api/category-query-options"
import { LoadingRegion } from "@/components/shared/loading-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import ContentError from "@/components/shared/content-error"
export default function CategoriesPageContent() {
  const hydrated = useHydrated()
  const query = useQuery(categoriesQueryOptions())
  return (
    <section className="bg-[#f8faf6] py-10 sm:py-14">
      <div className="site-container">
        <p className="eyebrow">Find your essentials</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#263f2a] sm:text-4xl">
          Care, in every category.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#64715b]">
          Explore equipment and supplies organised around the way you care.
        </p>
        {!hydrated || query.isPending ? (
          <LoadingRegion label="Loading categories" className="mt-9">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="rounded-2xl border bg-white p-5">
                  <Skeleton className="aspect-[1.8/1] rounded-xl" />
                  <Skeleton className="mt-5 h-5 w-3/4" />
                  <Skeleton className="mt-3 h-3 w-1/2" />
                </div>
              ))}
            </div>
          </LoadingRegion>
        ) : query.isError ? (
          <ContentError
            className="mt-9"
            title="Categories are temporarily unavailable"
            onRetry={() => void query.refetch()}
          />
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group overflow-hidden rounded-2xl border border-[#e1e8d9] bg-white p-4 transition hover:border-[#b3cba2] hover:shadow-[0_8px_28px_-20px_rgba(32,66,22,.25)]"
              >
                <div className="relative flex aspect-[1.8/1] items-center justify-center overflow-hidden rounded-xl bg-[#f1f5ea]">
                  {category.image === "/images/product-placeholder.svg" ? (
                    <Layers3
                      className="size-14 text-[#aec49a]"
                      strokeWidth={1}
                    />
                  ) : (
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="(max-width:640px) 90vw,(max-width:1024px) 45vw,380px"
                      className="object-contain p-6 transition duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 px-1 py-4">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-[#36502c]">
                      {category.name}
                    </h2>
                    <p className="mt-1 text-xs text-[#68765c]">
                      {category.countKnown === false
                        ? "Explore collection"
                        : `${category.productCount} products`}
                    </p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e0e9d7] text-[#688555] transition group-hover:bg-[#edf4e4]">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
