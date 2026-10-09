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
  product: Product
  className?: string
  sizes?: string
  eager?: boolean
}) {
  const remote = product.source === "remote"
  const hasImage = Boolean(product.image && product.image !== placeholder)
  const thumbnail = useQuery({
    queryKey: ["products", "thumbnail", product.id],
    queryFn: () => getProductThumbnail(product.id),
    enabled: remote && !hasImage,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const source = (hasImage ? product.image : thumbnail.data) || placeholder

  return (
    <Image
      src={failedSource === source ? placeholder : source}
      unoptimized={remote}
      alt={product.name}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailedSource(source)}
      className={cn(
        "object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none sm:p-6",
        className
      )}
    />
  )
}
