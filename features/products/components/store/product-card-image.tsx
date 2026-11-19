"use client"

import Image from "next/image"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getProductThumbnail } from "../../api/live-catalog"
import type { Product } from "../../types/product"
import { cn } from "@/lib/utils"

const placeholder = "/images/product-placeholder.svg"

export default function ProductCardImage({
  product,
  className,
  sizes = "(max-width:640px) 45vw,(max-width:1024px) 30vw,280px",
  eager = false,
}: {
  product: Pick<Product, "id" | "name" | "image" | "source">
  className?: string
  sizes?: string
  eager?: boolean
}) {
  const remote = product.source === "remote"
  const hasImage = Boolean(product.image && product.image !== placeholder)
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set()
  )
  const thumbnail = useQuery({
    queryKey: ["products", "thumbnail", product.id],
    queryFn: () => getProductThumbnail(product.id),
    enabled: remote && (!hasImage || failedSources.has(product.image)),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  const primary = hasImage ? product.image : thumbnail.data
  const source =
    (primary && !failedSources.has(primary) ? primary : "") ||
    (thumbnail.data && !failedSources.has(thumbnail.data)
      ? thumbnail.data
      : "") ||
    placeholder

  return (
    <Image
      src={source}
      unoptimized={remote}
      alt={product.name}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      onError={() => {
        if (source !== placeholder)
          setFailedSources((current) => new Set(current).add(source))
      }}
      className={cn(
        "object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none sm:p-6",
        className
      )}
    />
  )
}
