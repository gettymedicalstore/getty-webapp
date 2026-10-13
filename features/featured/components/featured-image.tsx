"use client"
import Image from "next/image"
import { ImageOff } from "lucide-react"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getFeaturedPhotoBlob } from "../api/featured"

export default function FeaturedImage({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const client = useQueryClient()
  const [source, setSource] = useState("")
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let mounted = true
    let url = ""
    client
      .fetchQuery({
        queryKey: ["featured", "image", id],
        queryFn: ({ signal }) => getFeaturedPhotoBlob(id, signal),
        staleTime: 60_000,
      })
      .then((blob) => {
        if (!mounted) return
        url = URL.createObjectURL(blob)
        setSource(url)
      })
      .catch(() => {
        if (mounted) setFailed(true)
      })
    return () => {
      mounted = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, client])
  return source ? (
    <Image
      src={source}
      alt={name}
      fill
      unoptimized
      sizes="(max-width:640px) 90vw, 320px"
      className="object-contain"
    />
  ) : (
    <span
      className="flex h-full items-center justify-center text-[#6d8174]"
      aria-label={failed ? "Advert image unavailable" : "Loading advert image"}
    >
      <ImageOff aria-hidden className="size-6" />
    </span>
  )
}
