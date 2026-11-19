"use client"

import Image from "next/image"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ImageIcon } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { GettyApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { getParcelPhotoUrl } from "../api/parcel-photo"

export default function ParcelPhoto({
  orderId,
  photo,
}: {
  orderId: string
  photo: { fileId: string; accessPath: string } | null | undefined
}) {
  const accountId = useAuthSession().data?.user?.id
  const [failed, setFailed] = useState<{ fileId: string; url: string } | null>(
    null
  )
  const link = useQuery({
    queryKey: ["parcel-photo", accountId, orderId, photo?.fileId],
    queryFn: () => getParcelPhotoUrl(orderId, photo!.accessPath),
    enabled: Boolean(accountId && photo),
    staleTime: 90_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 90_000
        : false,
    retry: false,
  })
  if (
    !photo ||
    (link.error instanceof GettyApiError && link.error.status === 404)
  )
    return null
  const ready = Boolean(
    link.data &&
    !link.isError &&
    !(failed?.fileId === photo.fileId && failed.url === link.data)
  )
  return (
    <section
      aria-label="Packed parcel"
      className="overflow-hidden rounded-lg border bg-white"
    >
      <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
        <ImageIcon className="text-primary size-4" aria-hidden />
        Packed parcel
      </div>
      {ready ? (
        <Image
          src={link.data!}
          alt="Packed parcel"
          width={640}
          height={480}
          unoptimized
          className="aspect-4/3 w-full object-cover"
          onError={() => {
            setFailed({ fileId: photo.fileId, url: link.data! })
            void link.refetch()
          }}
        />
      ) : (
        <div className="border-t px-4 py-4">
          <p className="text-muted-foreground text-sm leading-6">
            {link.isPending
              ? "Loading your parcel photo…"
              : "The parcel photo is temporarily unavailable."}
          </p>
          {!link.isPending && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setFailed(null)
                void link.refetch()
              }}
              disabled={link.isFetching}
            >
              {link.isFetching ? "Trying again…" : "Retry photo"}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
