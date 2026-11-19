"use client"
import Image from "next/image"
import { ImageOff } from "lucide-react"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getProductPhotoPage } from "@/features/admin/api/product-photos"
import { getFeaturedPhotoBlob } from "../api/featured"

export default function FeaturedImage({
  id,
  name,
  product,
  photo,
}: {
  id: string
  name: string
  product?: string
  photo?: string
}) {
  const [source, setSource] = useState<{ blob: Blob; url: string } | null>(null)
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set()
  )
  const productPhotos = useQuery({
    queryKey: ["featured", "catalog-photos", product],
    queryFn: () => getProductPhotoPage(product!),
    enabled: Boolean(product),
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })
  const catalogPhoto = productPhotos.data?.records.find(
    (item) => item.id === photo
  )
  const featured = useQuery({
    queryKey: ["featured", "image", id],
    queryFn: ({ signal }) => getFeaturedPhotoBlob(id, signal),
    enabled:
      !product ||
      productPhotos.isError ||
      (productPhotos.isSuccess &&
        (!catalogPhoto || failedSources.has(catalogPhoto.url))),
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })
  useEffect(() => {
    if (!featured.data) return
    const blob = featured.data
    const url = URL.createObjectURL(blob)
    let mounted = true
    queueMicrotask(() => {
      if (mounted) setSource({ blob, url })
    })
    return () => {
      mounted = false
      URL.revokeObjectURL(url)
    }
  }, [featured.data])
  const featuredSource =
    source && source.blob === featured.data ? source.url : ""
  const catalogSource = catalogPhoto?.url ?? ""
  const fallbackSource = productPhotos.data?.records[0]?.url ?? ""
  const image =
    (catalogSource && !failedSources.has(catalogSource) ? catalogSource : "") ||
    (featuredSource && !failedSources.has(featuredSource)
      ? featuredSource
      : "") ||
    (fallbackSource && !failedSources.has(fallbackSource) ? fallbackSource : "")
  return image ? (
    <Image
      src={image}
      alt={name}
      fill
      unoptimized
      sizes="(max-width:640px) 90vw, 320px"
      onError={() => setFailedSources((current) => new Set(current).add(image))}
      className="object-contain"
    />
  ) : (
    <span
      className="flex h-full items-center justify-center text-[#6d8174]"
      aria-label={
        featured.isError || failedSources.size > 0 || productPhotos.isError
          ? "Advert image unavailable"
          : "Loading advert image"
      }
    >
      <ImageOff aria-hidden className="size-6" />
    </span>
  )
}
