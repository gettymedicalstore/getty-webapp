"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useController, useForm } from "react-hook-form"
import {
  productImageSchema,
  productImagesFormSchema,
  productSingleImageFormSchema,
} from "@/lib/form-schemas"
import type { z } from "zod"

import { useEffect, useRef, useState, type MouseEvent } from "react"
import Image from "next/image"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { ImagePlus, Images, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { PhotoPage } from "@/lib/api/getty-contract"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getProductPhotoPage,
  prepareProductImageUpload,
  uploadProductImages,
  type UploadTarget,
} from "../api/product-photos"
import { FormError } from "./product-workspace-shared"

type SelectedImage = {
  file: File
  preview: string
  preparing: boolean
  target?: UploadTarget
  preparationError?: string
}
type UploadedImage = Pick<SelectedImage, "file" | "preview"> & { id: string }
type UploadMode = "single" | "multiple"

export default function ProductImageUpload({
  product,
  photosLink,
  published,
}: {
  product: string
  photosLink?: string
  published: boolean
}) {
  const client = useQueryClient()
  const [mode, setMode] = useState<UploadMode>("single")
  const photos = useInfiniteQuery({
    queryKey: ["managed-product", product, "photos", photosLink ?? null],
    queryFn: ({ pageParam }) =>
      getProductPhotoPage(product, photosLink, pageParam),
    initialPageParam: null as PhotoPage["nextCursor"],
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: published,
  })
  const form = useForm<z.infer<typeof productImagesFormSchema>>({
    resolver: zodResolver(
      mode === "single" ? productSingleImageFormSchema : productImagesFormSchema
    ),
    defaultValues: { images: [] },
    shouldUseNativeValidation: false,
  })
  const { field: imagesField } = useController({
    name: "images",
    control: form.control,
  })
  const input = useRef<HTMLInputElement>(null)
  const chooseButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const previewUrls = useRef(new Set<string>())
  const uploadedFiles = useRef(new Map<File, string>())
  const inFlight = useRef(false)
  const preparationGeneration = useRef(0)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedImage[]>([])
  const [saved, setSaved] = useState<UploadedImage[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [error, setError] = useState("")
  const [uploadFailed, setUploadFailed] = useState(false)
  const preparing = selected.some((image) => image.preparing)
  const ready =
    selected.length > 0 &&
    selected.every((image) => image.target && !image.preparing)
  const remotePhotos = photos.data?.pages.flatMap((page) => page.records) ?? []
  const remoteIds = new Set(remotePhotos.map((photo) => photo.id))
  const pendingPhotos = saved.filter((photo) => !remoteIds.has(photo.id))

  useEffect(() => {
    const urls = previewUrls.current
    return () => {
      preparationGeneration.current += 1
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function showDialog(mode: UploadMode, event: MouseEvent<HTMLButtonElement>) {
    if (inFlight.current) return
    returnFocus.current = event.currentTarget
    setMode(mode)
    setError("")
    setOpen(true)
  }

  function revoke(preview: string) {
    URL.revokeObjectURL(preview)
    previewUrls.current.delete(preview)
  }

  async function prepare(image: SelectedImage) {
    const generation = preparationGeneration.current
    setSelected((current) =>
      current.map((item) =>
        item.preview === image.preview
          ? {
              ...item,
              preparing: true,
              target: undefined,
              preparationError: undefined,
            }
          : item
      )
    )
    try {
      const target = await prepareProductImageUpload(image.file)
      if (generation !== preparationGeneration.current) return
      setSelected((current) =>
        current.map((item) =>
          item.preview === image.preview
            ? { ...item, target, preparing: false }
            : item
        )
      )
    } catch (cause) {
      if (generation !== preparationGeneration.current) return
      setSelected((current) =>
        current.map((item) =>
          item.preview === image.preview
            ? {
                ...item,
                preparing: false,
                preparationError:
                  cause instanceof Error
                    ? cause.message
                    : "This image could not be prepared. Please try again.",
              }
            : item
        )
      )
    }
  }

  function select(files: FileList | null) {
    if (!files || inFlight.current) return
    const candidates = Array.from(files)
    if (mode === "single" && candidates.length > 1) {
      setError("Choose only one image, or use Upload multiple images.")
      return
    }
    const valid = candidates.filter(
      (file) => productImageSchema.safeParse(file).success
    )
    setError(
      valid.length !== candidates.length
        ? "Choose non-empty JPG, PNG or WebP images. Unsupported files were excluded."
        : ""
    )
    if (!valid.length) return
    const current = mode === "single" ? [] : selected
    const additions: SelectedImage[] = []
    const seen = new Set(
      current.map(
        ({ file }) =>
          `${file.name}:${file.size}:${file.type}:${file.lastModified}`
      )
    )
    for (const file of valid) {
      const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`
      if (seen.has(key)) continue
      seen.add(key)
      const preview = URL.createObjectURL(file)
      previewUrls.current.add(preview)
      additions.push({ file, preview, preparing: true })
    }
    if (mode === "single") {
      preparationGeneration.current += 1
      selected.forEach((image) => revoke(image.preview))
      uploadedFiles.current.clear()
    }
    const next = [...current, ...additions]
    setSelected(next)
    setUploadFailed(false)
    form.setValue(
      "images",
      next.map((image) => image.file),
      { shouldValidate: true }
    )
    additions.forEach((image) => void prepare(image))
  }

  function remove(image: SelectedImage) {
    if (inFlight.current) return
    const next = selected.filter((item) => item !== image)
    setSelected(next)
    form.setValue(
      "images",
      next.map((item) => item.file),
      { shouldValidate: true }
    )
    uploadedFiles.current.delete(image.file)
    revoke(image.preview)
  }

  function closeDialog() {
    if (inFlight.current) return
    preparationGeneration.current += 1
    selected.forEach((image) => revoke(image.preview))
    uploadedFiles.current.clear()
    setSelected([])
    form.reset()
    setError("")
    setUploadFailed(false)
    setOpen(false)
  }

  async function upload({ images }: z.infer<typeof productImagesFormSchema>) {
    if (!ready || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError("")
    setUploadFailed(false)
    try {
      const fileIds = await uploadProductImages(product, images, {
        preparedUploads: new Map(
          selected.map((image) => [image.file, image.target!])
        ),
        uploadedFiles: uploadedFiles.current,
        onProgress: (completed, total) => setProgress({ completed, total }),
      })
      setSaved((current) => [
        ...current,
        ...selected.map((image, index) => ({
          file: image.file,
          preview: image.preview,
          id: fileIds[index],
        })),
      ])
      setSelected([])
      form.reset()
      uploadedFiles.current.clear()
      setOpen(false)
      toast.success(
        `${selected.length} ${selected.length === 1 ? "image" : "images"} uploaded to this product.`
      )
      await Promise.all([
        client.invalidateQueries({ queryKey: ["managed-product", product] }),
        client.invalidateQueries({ queryKey: ["products"] }),
      ])
    } catch (cause) {
      setUploadFailed(true)
      setError(
        cause instanceof Error
          ? cause.message
          : "The images could not be uploaded. Please try again."
      )
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <section className="space-y-5" aria-label="Product photos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#253c2e]">
            Photos
          </h2>
          <p className="mt-1 text-sm text-[#5e6f63]">
            Upload clear images for this product’s catalogue listing.
          </p>
        </div>
        <UploadButtons onSelect={showDialog} disabled={busy} />
      </div>
      <div className="rounded-xl border border-[#dfe8e1] bg-white p-5 sm:p-7">
        {published && photos.isError && (
          <div role="alert" className="mb-5 rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">
              We couldn’t load the product photos. Please try again.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={photos.isFetching}
              onClick={() => void photos.refetch()}
            >
              {photos.isFetching ? "Loading…" : "Try again"}
            </Button>
          </div>
        )}
        {published && photos.isPending && !pendingPhotos.length ? (
          <div
            role="status"
            aria-label="Loading product photos"
            className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : remotePhotos.length || pendingPhotos.length ? (
          <>
            <p className="mb-4 text-sm font-medium text-[#536357]">
              Product images
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {remotePhotos.map((photo) => (
                <ImagePreview
                  key={photo.id}
                  src={photo.url}
                  name={photo.name}
                />
              ))}
              {pendingPhotos.map((image) => (
                <ImagePreview
                  key={image.id}
                  src={image.preview}
                  name={image.file.name}
                />
              ))}
            </div>
            {remotePhotos.length + pendingPhotos.length > 5 &&
              photos.hasNextPage && (
                <div className="mt-5 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={photos.isFetchingNextPage}
                    onClick={() => void photos.fetchNextPage()}
                  >
                    {photos.isFetchingNextPage
                      ? "Loading…"
                      : "Load more images"}
                  </Button>
                </div>
              )}
          </>
        ) : !published || !photos.isError ? (
          <div className="flex flex-col items-center py-9 text-center">
            <div className="grid size-14 place-items-center rounded-xl bg-[#edf6ef] text-[#39835a]">
              <Images aria-hidden className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold text-[#344d3d]">
              Add product photos
            </h3>
            <p className="mt-2 text-sm text-[#5e6f63]">
              Add a single image or upload several images together.
            </p>
            <div className="mt-5">
              <UploadButtons onSelect={showDialog} disabled={busy} />
            </div>
          </div>
        ) : null}
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeDialog()
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] flex-col sm:max-w-2xl"
          initialFocus={chooseButton}
          finalFocus={() =>
            returnFocus.current?.isConnected ? returnFocus.current : null
          }
          showCloseButton={!busy}
          aria-busy={busy}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === "single"
                ? "Upload product image"
                : "Upload product images"}
            </DialogTitle>
            <DialogDescription>
              {mode === "single"
                ? "Choose one image. Review it before adding it to the product."
                : "Choose multiple images. Review your selection before adding them to the product."}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(event) => void form.handleSubmit(upload)(event)}
            className="flex min-h-0 flex-col gap-5"
          >
            <div className="min-h-0 space-y-5 overflow-y-auto">
              <input
                ref={(element) => {
                  input.current = element
                  imagesField.ref(element)
                }}
                name={imagesField.name}
                onBlur={imagesField.onBlur}
                aria-invalid={Boolean(form.formState.errors.images)}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple={mode === "multiple"}
                disabled={busy}
                className="sr-only"
                aria-label={
                  mode === "single"
                    ? "Choose product image"
                    : "Choose product images"
                }
                onChange={(event) => {
                  select(event.currentTarget.files)
                  event.currentTarget.value = ""
                }}
              />
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  select(event.dataTransfer.files)
                }}
                className="rounded-xl border border-dashed border-[#b9cfc1] bg-[#f7faf8] px-5 py-6 text-center"
              >
                <UploadCloud
                  aria-hidden
                  className="mx-auto size-7 text-[#39835a]"
                />
                <p className="mt-3 text-sm font-medium text-[#344d3d]">
                  {mode === "single"
                    ? "Drag an image here or choose a file"
                    : "Drag images here or choose files"}
                </p>
                <p className="mt-1 text-xs text-[#5e6f63]">
                  JPG, PNG or WebP ·{" "}
                  {mode === "single"
                    ? "One image per upload"
                    : "Multiple images supported"}
                </p>
                <Button
                  ref={chooseButton}
                  type="button"
                  variant="outline"
                  className="mt-4"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  {mode === "single"
                    ? selected.length
                      ? "Change image"
                      : "Choose image"
                    : selected.length
                      ? "Add more images"
                      : "Choose images"}
                </Button>
              </div>
              {selected.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-[#536357]">
                    {selected.length}{" "}
                    {selected.length === 1 ? "image" : "images"} selected
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selected.map((image) => (
                      <div key={image.preview} className="space-y-2">
                        <ImagePreview
                          src={image.preview}
                          name={image.file.name}
                        >
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Remove ${image.file.name} from selection`}
                            onClick={() => remove(image)}
                            className="absolute top-2 right-2 grid size-8 place-items-center rounded-lg border border-[#dce6de] bg-white text-[#587361] shadow-sm hover:text-red-700 disabled:opacity-50"
                          >
                            <X aria-hidden className="size-4" />
                          </button>
                        </ImagePreview>
                        <p role="status" className="text-xs text-[#536357]">
                          {image.preparing
                            ? "Preparing…"
                            : image.target
                              ? "Ready to upload"
                              : "Preparation failed"}
                        </p>
                        {image.preparationError && (
                          <div className="space-y-2">
                            <p role="alert" className="text-xs text-red-700">
                              {image.preparationError}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy || image.preparing}
                              aria-label={`Retry preparing ${image.file.name}`}
                              onClick={() => void prepare(image)}
                            >
                              Try again
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <FormError
                message={error || form.formState.errors.images?.message || ""}
              />
              {uploadFailed &&
                selected.some(
                  (image) => !uploadedFiles.current.has(image.file)
                ) && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || preparing}
                    onClick={() => {
                      setError("")
                      setUploadFailed(false)
                      selected
                        .filter(
                          (image) => !uploadedFiles.current.has(image.file)
                        )
                        .forEach((image) => void prepare(image))
                    }}
                  >
                    Prepare images again
                  </Button>
                )}
              {busy && (
                <p role="status" className="text-sm text-[#536357]">
                  {progress.completed === progress.total
                    ? `Saving ${selected.length === 1 ? "image" : "images"} to the product…`
                    : `Uploading image ${progress.completed + 1} of ${progress.total}…`}
                </p>
              )}
            </div>
            <DialogFooter className="shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !ready}>
                <UploadCloud aria-hidden className="size-4" />
                {busy
                  ? "Uploading…"
                  : preparing
                    ? "Preparing…"
                    : selected.length
                      ? `Upload ${selected.length} ${selected.length === 1 ? "image" : "images"}`
                      : mode === "single"
                        ? "Upload image"
                        : "Upload images"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function UploadButtons({
  onSelect,
  disabled,
}: {
  onSelect: (mode: UploadMode, event: MouseEvent<HTMLButtonElement>) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={(event) => onSelect("single", event)}
      >
        <ImagePlus aria-hidden className="size-4" />
        Upload single image
      </Button>
      <Button
        type="button"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={(event) => onSelect("multiple", event)}
      >
        <Images aria-hidden className="size-4" />
        Upload multiple images
      </Button>
    </div>
  )
}

function ImagePreview({
  src,
  name,
  children,
}: {
  src: string
  name: string
  children?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e2e9e3] bg-white">
      <div className="relative aspect-square bg-[#f5f8f5]">
        <Image
          src={src}
          alt={name}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, 220px"
          className="object-contain"
        />
        {children}
      </div>
      <p
        className="truncate px-3 py-2.5 text-xs font-medium text-[#536357]"
        title={name}
      >
        {name}
      </p>
    </div>
  )
}
