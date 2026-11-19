"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  publicFeaturedQueryOptions,
  featuredPhotoUrl,
} from "@/features/featured/api/featured"
import { featuredStatus } from "@/features/featured/schema"
import { productQueryOptions } from "@/features/products/api/get-product"
import ProductCardImage from "@/features/products/components/store/product-card-image"
import {
  productMoney,
  productPricing,
} from "@/features/products/utils/product-pricing"

export default function HeroCarousel() {
  const query = useQuery(publicFeaturedQueryOptions(20))
  const [now, setNow] = useState(() => Date.now())
  const featured = (query.data ?? [])
    .filter((entry) =>
      ["active", "unknown"].includes(featuredStatus(entry, now))
    )
    .sort((a, b) => a.ordinal - b.ordinal)[0]
  useEffect(() => {
    const boundary = (query.data ?? [])
      .flatMap((entry) => [Date.parse(entry.starts), Date.parse(entry.ends)])
      .filter((time) => Number.isFinite(time) && time > now)
      .sort((a, b) => a - b)[0]
    if (!boundary) return
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(boundary - Date.now() + 50, 2_147_483_647)
    )
    return () => clearTimeout(timer)
  }, [query.data, now])
  const showFeatured = query.isPending || Boolean(featured)
  const detail = useQuery(productQueryOptions(featured?.product ?? ""))
  const product = detail.data
  const href = featured
    ? `/products/${product?.slug ?? featured.product}`
    : "/products"
  const name = product?.name ?? featured?.productName ?? "Featured product"
  const originalPrice = product
    ? productPricing(product.price, product.compareAtPrice).originalPrice
    : null
  return (
    <section
      className="relative isolate overflow-hidden border-b border-[#e3e9e5] bg-[#f8faf7]"
      aria-labelledby="store-introduction"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden h-[52%] w-full lg:block"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          d="M0 231C184 169 287 314 450 232S740 154 906 245s315-120 534-75v150H0Z"
          fill="#e5f1e7"
        />
        <path
          d="M0 277c182-120 282 81 465-22s305-49 445 5 326-118 530-73v133H0Z"
          fill="#cbe5d2"
        />
        <path
          d="M0 269c157-124 279 100 467-40s327-72 474 19 342-130 499-93"
          fill="none"
          stroke="#71b78c"
          strokeWidth="2"
          opacity=".75"
        />
      </svg>
      <div
        className={`site-container relative grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] ${showFeatured ? "lg:min-h-[650px]" : "lg:min-h-[430px]"}`}
      >
        <div className="flex flex-col justify-center py-12 sm:py-16 lg:pr-16">
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
        {showFeatured && (
          <aside
            className="relative w-full max-w-[680px] min-w-0 justify-self-center pb-12 lg:justify-self-end lg:py-8"
            aria-label="Featured product"
          >
            <div aria-live="polite" aria-atomic="true">
              {featured ? (
                <>
                  <div className="relative mx-auto h-[350px] max-w-[640px] sm:h-[420px] lg:h-[480px]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-[8%] top-[6%] bottom-[3%] rotate-[-12deg] bg-[#e2efe3]"
                      style={{
                        borderRadius: "48% 52% 61% 39% / 51% 41% 59% 49%",
                      }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute top-[8%] right-[4%] size-24 rounded-full border border-[#7db998]/50 sm:size-32"
                    />
                    <Link
                      href={href}
                      aria-label={"View " + name}
                      className="group absolute inset-x-[2%] top-[2%] bottom-0 block"
                      style={{
                        WebkitMaskImage:
                          "radial-gradient(ellipse 72% 74% at center, #000 70%, transparent 100%)",
                        maskImage:
                          "radial-gradient(ellipse 72% 74% at center, #000 70%, transparent 100%)",
                      }}
                    >
                      <ProductCardImage
                        key={featured.id}
                        product={{
                          id: featured.product,
                          name,
                          image: featuredPhotoUrl(featured.id),
                          source: "remote",
                        }}
                        eager
                        sizes="(max-width:640px) 100vw, (max-width:1024px) 80vw, 640px"
                        className="p-0 sm:p-0"
                      />
                    </Link>
                  </div>
                  <div className="relative mt-3 flex flex-wrap items-center justify-between gap-4">
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#11663f] underline-offset-4 transition hover:underline"
                    >
                      Explore product
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                    {product && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xl font-semibold whitespace-nowrap text-[#145338] tabular-nums">
                          <span className="sr-only">Price: </span>
                          {productMoney(product.price, product.currency)}
                        </span>
                        {originalPrice !== null && (
                          <del className="text-xs text-[#708778]">
                            {productMoney(originalPrice, product.currency)}
                          </del>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : query.isPending ? (
                <div
                  role="status"
                  className="flex min-h-[420px] animate-pulse items-center justify-center text-sm text-[#547160] motion-reduce:animate-none"
                >
                  Loading featured products…
                </div>
              ) : null}
            </div>
          </aside>
        )}
        {!showFeatured && (
          <div className="relative my-8 hidden h-[330px] self-center lg:block">
            <Image
              src="/images/18.webp"
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 0px"
              className="object-contain"
            />
          </div>
        )}
      </div>
    </section>
  )
}
