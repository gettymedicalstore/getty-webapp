"use client"

import { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useController, useForm } from "react-hook-form"
import type { z } from "zod"
import {
  productImageSchema,
  productImagesFormSchema,
  replacementImageFormSchema,
} from "@/lib/form-schemas"
import Image from "next/image"
import { Menu } from "@base-ui/react/menu"
import {
  ImagePlus,
  Images,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { FormError } from "./product-workspace-shared"

export type ProductPhoto = {
  id: string
  name: string
  url: string | null
}

type StagedPhoto = { file: File; preview: string }

export default function ProductPhotos({
  productName,
  photos,
  loading,
  error,
  onRetry,
  onUpload,
  onReplace,
  onDelete,
}: {
  productName: string
  photos: ProductPhoto[]
  loading: boolean
  error: string
  onRetry: () => void
  onUpload: (files: File[]) => Promise<void>
  onReplace: (photo: ProductPhoto, file: File) => Promise<void>
  onDelete: (photo: ProductPhoto) => Promise<void>
}) {
  const input = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const stagedRef = useRef<StagedPhoto[]>([])
  const replacementRef = useRef<StagedPhoto | null>(null)
  const [staged, setStaged] = useState<StagedPhoto[]>([])
  const [target, setTarget] = useState<ProductPhoto | null>(null)
  const [replacement, setReplacement] = useState<StagedPhoto | null>(null)
  const [removing, setRemoving] = useState<ProductPhoto | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const uploadForm = useForm<z.infer<typeof productImagesFormSchema>>({
    resolver: zodResolver(productImagesFormSchema),
    defaultValues: { images: [] },
    shouldUseNativeValidation: false,
  })
  const replaceForm = useForm<z.infer<typeof replacementImageFormSchema>>({
    resolver: zodResolver(replacementImageFormSchema),
    shouldUseNativeValidation: false,
  })
  const { field: imagesField } = useController({
    name: "images",
    control: uploadForm.control,
  })
  const { field: replacementField } = useController({
    name: "image",
    control: replaceForm.control,
  })

  useEffect(() => {
    stagedRef.current = staged
  }, [staged])
  useEffect(() => {
    replacementRef.current = replacement
  }, [replacement])
  useEffect(
    () => () => {
      stagedRef.current.forEach((item) => URL.revokeObjectURL(item.preview))
      if (replacementRef.current)
        URL.revokeObjectURL(replacementRef.current.preview)
    },
    []
  )

  function selectFiles(files: FileList | File[] | null) {
    if (!files || busy) return
    const images = Array.from(files).filter(
      (file) => productImageSchema.safeParse(file).success
    )
    if (images.length !== files.length)
      setActionError("Choose JPG, PNG or WebP images.")
    else setActionError("")
    const next = [
      ...staged,
      ...images.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]
    setStaged(next)
    uploadForm.setValue(
      "images",
      next.map((item) => item.file),
      { shouldValidate: true }
    )
    if (input.current) input.current.value = ""
  }

  function discard(item: StagedPhoto) {
    const next = staged.filter((entry) => entry !== item)
    setStaged(next)
    uploadForm.setValue(
      "images",
      next.map((entry) => entry.file),
      { shouldValidate: true }
    )
    URL.revokeObjectURL(item.preview)
  }

  async function upload({ images }: z.infer<typeof productImagesFormSchema>) {
    if (!staged.length || busy) return
    setBusy(true)
    setActionError("")
    try {
      await onUpload(images)
      staged.forEach((item) => URL.revokeObjectURL(item.preview))
      setStaged([])
      uploadForm.reset()
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Photos could not be uploaded."
      )
    } finally {
      setBusy(false)
    }
  }

  async function confirmReplace({
    image,
  }: z.infer<typeof replacementImageFormSchema>) {
    if (!target || !replacement || busy) return
    setBusy(true)
    setActionError("")
    try {
      await onReplace(target, image)
      URL.revokeObjectURL(replacement.preview)
      setReplacement(null)
      setTarget(null)
      replaceForm.reset()
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "The photo could not be replaced."
      )
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!removing || busy) return
    setBusy(true)
    setActionError("")
    try {
      await onDelete(removing)
      setRemoving(null)
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "The photo could not be deleted."
      )
    } finally {
      setBusy(false)
    }
  }

  function closeDialogs() {
    if (busy) return
    if (replacement) URL.revokeObjectURL(replacement.preview)
    setReplacement(null)
    replaceForm.reset()
    setTarget(null)
    setRemoving(null)
    setActionError("")
  }

  return (
    <section className="space-y-6" aria-label="Product photos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#253c2e]">
            Photos
          </h2>
          <p className="mt-1 text-sm text-[#5e6f63]">
            Add clear product images for the catalogue listing.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-lg"
          onClick={() => input.current?.click()}
        >
          <Plus aria-hidden className="size-4" />
          Add photos
        </Button>
      </div>

      <input
        ref={(element) => {
          input.current = element
          imagesField.ref(element)
        }}
        name={imagesField.name}
        onBlur={imagesField.onBlur}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-label="Choose product photos"
        onChange={(event) => selectFiles(event.currentTarget.files)}
      />
      <input
        ref={(element) => {
          replaceInput.current = element
          replacementField.ref(element)
        }}
        name={replacementField.name}
        onBlur={replacementField.onBlur}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose replacement photo"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file)
            replaceForm.setValue("image", file, { shouldValidate: true })
          if (file && productImageSchema.safeParse(file).success) {
            if (replacement) URL.revokeObjectURL(replacement.preview)
            setReplacement({ file, preview: URL.createObjectURL(file) })
            setActionError("")
          } else if (file) setActionError("Choose a JPG, PNG or WebP image.")
          event.currentTarget.value = ""
        }}
      />

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          selectFiles(event.dataTransfer.files)
        }}
        className="rounded-xl border border-dashed border-[#bbd3c3] bg-[#f7faf7] px-5 py-8 text-center"
      >
        <UploadCloud aria-hidden className="mx-auto size-7 text-[#39835a]" />
        <p className="mt-3 text-sm font-medium text-[#304739]">
          Drag images here, or choose files from your device
        </p>
        <p className="mt-1 text-xs text-[#5e6f63]">JPG, PNG or WebP</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-lg"
          onClick={() => input.current?.click()}
        >
          Browse files
        </Button>
      </div>

      {staged.length > 0 && (
        <form
          noValidate
          onSubmit={(event) => void uploadForm.handleSubmit(upload)(event)}
          className="rounded-xl border border-[#dfe8e1] bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[#304638]">Ready to upload</h3>
              <p className="mt-1 text-xs text-[#5e6f63]">
                {staged.length} {staged.length === 1 ? "image" : "images"}{" "}
                selected
              </p>
            </div>
            <Button type="submit" disabled={busy}>
              <ImagePlus aria-hidden className="size-4" />
              {busy ? "Uploading…" : "Upload photos"}
            </Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {staged.map((item) => (
              <PhotoTile
                key={item.preview}
                name={item.file.name}
                url={item.preview}
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${item.file.name} from selection`}
                  onClick={() => discard(item)}
                  className="grid size-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-[#587361] hover:text-red-700 disabled:opacity-50"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </PhotoTile>
            ))}
          </div>
        </form>
      )}

      {!target && !removing && (
        <FormError
          message={uploadForm.formState.errors.images?.message ?? actionError}
        />
      )}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[#e1e8e2] bg-white px-5 py-8 text-center">
          <p className="text-sm text-[#465f4c]">{error}</p>
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-[#e1e8e2] bg-white px-5 py-12 text-center">
          <Images aria-hidden className="mx-auto size-8 text-[#8aa799]" />
          <h3 className="mt-4 font-semibold text-[#344d3d]">No photos yet</h3>
          <p className="mt-2 text-sm text-[#5e6f63]">
            Add the first image to show customers what this product looks like.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              name={photo.name}
              url={photo.url}
              productName={productName}
            >
              <Menu.Root>
                <Menu.Trigger
                  aria-label={`Manage ${photo.name}`}
                  className="grid size-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-[#587361] hover:bg-[#f0f6f1]"
                >
                  <MoreHorizontal aria-hidden className="size-5" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner align="end" sideOffset={6} className="z-50">
                    <Menu.Popup className="w-44 rounded-xl border border-[#e1e9e3] bg-white p-1.5 shadow-lg outline-none">
                      <Menu.Item
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-[#355540] outline-none data-highlighted:bg-[#f0f6f1]"
                        onClick={() => setTarget(photo)}
                      >
                        <Pencil aria-hidden className="size-4" />
                        Replace image
                      </Menu.Item>
                      <Menu.Item
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-red-700 outline-none data-highlighted:bg-red-50"
                        onClick={() => setRemoving(photo)}
                      >
                        <Trash2 aria-hidden className="size-4" />
                        Delete image
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </PhotoTile>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent initialFocus={cancelButton} showCloseButton={!busy}>
          <DialogTitle>Replace this image?</DialogTitle>
          <DialogDescription>
            Choose an image to replace {target?.name} in the product gallery.
          </DialogDescription>
          <form
            noValidate
            onSubmit={(event) =>
              void replaceForm.handleSubmit(confirmReplace)(event)
            }
            className="space-y-5"
          >
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => replaceInput.current?.click()}
            >
              Choose replacement image
            </Button>
            {replacement && (
              <div className="relative aspect-video overflow-hidden rounded-lg bg-[#f5f7f5]">
                <Image
                  src={replacement.preview}
                  alt="Replacement preview"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            )}
            <FormError
              message={
                replaceForm.formState.errors.image?.message ?? actionError
              }
            />
            <DialogFooter>
              <Button
                ref={cancelButton}
                type="button"
                variant="outline"
                disabled={busy}
                onClick={closeDialogs}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !replacement}>
                {busy ? "Replacing…" : "Replace image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent initialFocus={cancelButton} showCloseButton={!busy}>
          <DialogTitle>Delete this image?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {removing?.name} from this product?
          </DialogDescription>
          <FormError message={actionError} />
          <DialogFooter>
            <Button
              ref={cancelButton}
              variant="outline"
              disabled={busy}
              onClick={closeDialogs}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void confirmDelete()}
            >
              {busy ? "Deleting…" : "Delete image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function PhotoTile({
  name,
  url,
  productName,
  children,
}: {
  name: string
  url: string | null
  productName?: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e1e9e3] bg-white">
      <div className="relative aspect-square bg-[#f5f7f5]">
        {url ? (
          <Image
            src={url}
            alt={`${productName ?? "Product"}: ${name}`}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain"
          />
        ) : (
          <Images
            aria-hidden
            className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-[#9caf9f]"
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <span
          className="min-w-0 truncate text-sm font-medium text-[#344b3c]"
          title={name}
        >
          {name}
        </span>
        {children}
      </div>
    </div>
  )
}
