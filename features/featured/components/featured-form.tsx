"use client"
import Image from "next/image"
import Link from "next/link"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { ArrowUpRight, ImageIcon } from "lucide-react"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
  FormTextarea,
  FieldError,
} from "@/components/shared/form/validated-form"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import type { PhotoPage } from "@/lib/api/getty-contract"
import {
  fieldClass,
  FormError,
} from "@/features/admin/components/product-workspace-shared"
import {
  getProductPhotoPage,
  prepareProductImageUpload,
  uploadImageFile,
  type UploadTarget,
} from "@/features/admin/api/product-photos"
import {
  featuredFormSchema,
  featuredImageSchema,
  lagosDateInput,
  type FeaturedEntry,
  type FeaturedFormValues,
} from "../schema"
import { getFeaturedOptions, getNextFeaturedOrdinal } from "../api/featured"
import {
  copyProductPhotoForFeatured,
  type CataloguePhotoSelection,
} from "../api/product-photo-copy"
import FeaturedImage from "./featured-image"

export default function FeaturedForm({
  entry,
  layout = "dialog",
  busy,
  error,
  onSave,
  onCancel,
  onUploadBusy,
}: {
  entry?: FeaturedEntry
  layout?: "dialog" | "page"
  busy: boolean
  error: string
  onSave: (values: FeaturedFormValues) => Promise<void>
  onCancel: () => void
  onUploadBusy: (busy: boolean) => void
}) {
  const [catalogueSelection, setCatalogueSelection] =
    useState<CataloguePhotoSelection | null>(null)
  const copiedPhoto = useRef<{
    product: string
    source: string
    file: string
  } | null>(null)
  const [copying, setCopying] = useState(false)
  const [copyError, setCopyError] = useState("")

  async function submit(values: FeaturedFormValues) {
    const selected = catalogueSelection
    if (
      !selected ||
      selected.id !== values.photo ||
      selected.product !== values.product
    ) {
      setCopyError("")
      await onSave(values)
      return
    }
    setCopying(true)
    setCopyError("")
    try {
      let file =
        copiedPhoto.current?.product === selected.product &&
        copiedPhoto.current.source === selected.id
          ? copiedPhoto.current.file
          : ""
      if (!file) {
        file = await copyProductPhotoForFeatured(selected)
        copiedPhoto.current = {
          product: selected.product,
          source: selected.id,
          file,
        }
      }
      await onSave({ ...values, photo: file })
    } catch (cause) {
      setCopyError(
        cause instanceof Error
          ? cause.message
          : "Could not prepare this product photo. Try again."
      )
    } finally {
      setCopying(false)
    }
  }

  return (
    <ValidatedForm
      schema={featuredFormSchema}
      defaultValues={{
        tenant: entry?.tenant ?? "",
        product: entry?.product ?? "",
        photo: entry?.photo ?? "",
        caption: entry?.caption ?? "",
        starts: lagosDateInput(entry?.starts ?? new Date().toISOString()),
        ends: lagosDateInput(entry?.ends ?? ""),
        ordinal: entry ? String(entry.ordinal) : "",
      }}
      onSubmit={submit}
      className="space-y-5"
    >
      <Fields
        entry={entry}
        layout={layout}
        busy={busy || copying}
        copying={copying}
        error={copyError || error}
        onCancel={onCancel}
        onUploadBusy={onUploadBusy}
        setCatalogueSelection={setCatalogueSelection}
      />
    </ValidatedForm>
  )
}
function Fields({
  entry,
  layout = "dialog",
  busy,
  copying,
  error,
  onCancel,
  onUploadBusy,
  setCatalogueSelection,
}: {
  entry?: FeaturedEntry
  layout?: "dialog" | "page"
  busy: boolean
  copying: boolean
  error: string
  onCancel: () => void
  onUploadBusy: (busy: boolean) => void
  setCatalogueSelection: Dispatch<
    SetStateAction<CataloguePhotoSelection | null>
  >
}) {
  const { setValue, resetField, formState } = useFormContext()
  const tenant = useWatch({ name: "tenant" }) as string
  const photo = useWatch({ name: "photo" }) as string
  const caption = useWatch({ name: "caption" }) as string
  const product = useWatch({ name: "product" }) as string
  const vendors = useQuery({
    queryKey: ["featured", "vendor-options"],
    queryFn: () => getFeaturedOptions("vendors"),
  })
  const products = useQuery({
    queryKey: ["featured", "product-options", tenant],
    queryFn: () => getFeaturedOptions("products", tenant),
    enabled: Boolean(tenant),
  })
  const productPhotos = useInfiniteQuery({
    queryKey: ["featured", "product-photos", product],
    queryFn: ({ pageParam }) =>
      getProductPhotoPage(product, undefined, pageParam),
    initialPageParam: null as PhotoPage["nextCursor"],
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(product),
  })
  const nextPosition = useQuery({
    queryKey: ["featured", "next-position"],
    queryFn: getNextFeaturedOrdinal,
    enabled: !entry,
  })
  useEffect(() => {
    if (!entry && nextPosition.data && !formState.dirtyFields.ordinal)
      resetField("ordinal", { defaultValue: String(nextPosition.data.next) })
  }, [entry, nextPosition.data, formState.dirtyFields.ordinal, resetField])
  const availablePhotos = useMemo(
    () => productPhotos.data?.pages.flatMap((page) => page.records) ?? [],
    [productPhotos.data]
  )
  const vendorOptions = vendors.data ?? []
  const productOptions = products.data ?? []
  const productName =
    productOptions.find((item) => item.id === product)?.name ??
    (entry?.product === product ? entry.productName : "")
  const vendorName =
    vendorOptions.find((item) => item.id === tenant)?.name ??
    (entry?.tenant === tenant ? entry.vendorName : "")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [phase, setPhase] = useState<
    "idle" | "preparing" | "uploading" | "uploaded" | "failed"
  >("idle")
  const [imageError, setImageError] = useState("")
  const generation = useRef(0)
  const choosing = useRef<HTMLInputElement>(null)
  const uploading = phase === "preparing" || phase === "uploading"
  const selectedProductPhoto = availablePhotos.find((item) => item.id === photo)
  const photoPreview = preview || selectedProductPhoto?.url || ""
  const showEntryPhoto =
    Boolean(entry) && photo === entry?.photo && product === entry?.product
  const firstProductPhotoId = availablePhotos[0]?.id
  useEffect(() => {
    if (product && firstProductPhotoId && !photo && !file) {
      setCatalogueSelection({
        ...availablePhotos[0],
        product,
      })
      setValue("photo", firstProductPhotoId, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [
    product,
    firstProductPhotoId,
    photo,
    file,
    setValue,
    availablePhotos,
    setCatalogueSelection,
  ])
  useEffect(() => {
    onUploadBusy(uploading || copying)
  }, [uploading, copying, onUploadBusy])
  useEffect(
    () => () => {
      generation.current++
    },
    []
  )
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )
  async function prepare(selected: File) {
    const run = ++generation.current
    setCatalogueSelection(null)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setImageError("")
    setPhase("preparing")
    setValue("photo", "", { shouldDirty: true })
    try {
      const next = await prepareProductImageUpload(selected)
      if (run === generation.current) {
        await upload(selected, next, run)
      }
    } catch (cause) {
      if (run === generation.current) {
        setPhase("failed")
        setImageError(
          cause instanceof Error ? cause.message : "Unable to prepare image."
        )
      }
    }
  }
  function resetImage() {
    generation.current++
    setCatalogueSelection(null)
    setFile(null)
    setPreview("")
    setPhase("idle")
    setImageError("")
    setValue("photo", "", { shouldDirty: true, shouldValidate: true })
  }
  function chooseProductPhoto(item: (typeof availablePhotos)[number]) {
    generation.current++
    setCatalogueSelection({ ...item, product })
    setFile(null)
    setPreview("")
    setPhase("idle")
    setImageError("")
    setValue("photo", item.id, { shouldDirty: true, shouldValidate: true })
  }
  async function upload(
    selected: File,
    uploadTarget: UploadTarget,
    run: number
  ) {
    setPhase("uploading")
    setImageError("")
    try {
      const id = await uploadImageFile(selected, uploadTarget)
      if (run === generation.current) {
        setValue("photo", id, { shouldDirty: true, shouldValidate: true })
        setPhase("uploaded")
      }
    } catch (cause) {
      if (run === generation.current) {
        setPhase("failed")
        setImageError(
          cause instanceof Error ? cause.message : "Unable to upload image."
        )
      }
    }
  }
  return (
    <div
      className={
        layout === "page"
          ? "grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          : ""
      }
    >
      <div
        className={
          layout === "page"
            ? "min-w-0 space-y-6 rounded-xl border border-[#dfe7e1] bg-white p-5 sm:p-7"
            : "space-y-5"
        }
      >
        <div
          className={
            layout === "page" ? "grid gap-6" : "grid gap-5 sm:grid-cols-2"
          }
        >
          <div className="space-y-2">
            <label htmlFor="featured-vendor" className="text-sm font-medium">
              Vendor
            </label>
            <FormSelect
              id="featured-vendor"
              name="tenant"
              required
              className={fieldClass}
              disabled={busy || uploading || vendors.isPending}
              onChange={() => {
                setValue("product", "", { shouldDirty: true })
                resetImage()
              }}
            >
              <option value="">
                {vendors.isPending ? "Loading vendors…" : "Choose a vendor"}
              </option>
              {entry?.tenant &&
                !vendorOptions.some((item) => item.id === entry.tenant) && (
                  <option value={entry.tenant}>
                    {entry.vendorName || "Current vendor"}
                  </option>
                )}
              {vendorOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </FormSelect>
            {vendors.isError && (
              <div>
                <FormError message="Could not load vendors." />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void vendors.refetch()}
                >
                  Retry vendors
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="featured-product" className="text-sm font-medium">
              Published product
            </label>
            <FormSelect
              id="featured-product"
              name="product"
              required
              className={fieldClass}
              disabled={busy || uploading || !tenant || products.isPending}
              onChange={resetImage}
            >
              <option value="">
                {!tenant
                  ? "Choose a vendor first"
                  : products.isPending
                    ? "Loading products…"
                    : "Choose a product"}
              </option>
              {entry?.product &&
                entry.tenant === tenant &&
                !productOptions.some((item) => item.id === entry.product) && (
                  <option value={entry.product}>
                    {entry.productName || "Current product"}
                  </option>
                )}
              {productOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </FormSelect>
            {tenant && products.isSuccess && !productOptions.length && (
              <p className="text-xs text-[#5e6f63]">
                This vendor has no published products available.
              </p>
            )}
            {products.isError && (
              <div>
                <FormError message="Could not load products." />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void products.refetch()}
                >
                  Retry products
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3 rounded-lg border border-[#dfe7e1] bg-[#f8faf8] p-4">
          <div>
            <p className="text-sm font-semibold">Featured photo</p>
            <p className="mt-1 text-xs leading-5 text-[#5e6f63]">
              Use a photo from the selected product, or upload a different
              image.
            </p>
          </div>
          {product && productPhotos.isPending && (
            <p role="status" className="text-xs text-[#5e6f63]">
              Loading product photos…
            </p>
          )}
          {product && productPhotos.isError && (
            <div className="flex flex-wrap items-center gap-3">
              <FormError message="Could not load this product’s photos." />
              <Button
                type="button"
                variant="outline"
                disabled={busy || uploading}
                onClick={() => void productPhotos.refetch()}
              >
                Retry photos
              </Button>
            </div>
          )}
          {product &&
            productPhotos.data &&
            (availablePhotos.length ? (
              <>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {availablePhotos.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Use product photo ${index + 1}: ${item.name}`}
                      aria-pressed={photo === item.id}
                      disabled={busy || uploading}
                      onClick={() => chooseProductPhoto(item)}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#087b4c] ${
                        photo === item.id
                          ? "border-[#087b4c]"
                          : "border-[#dfe7e1] hover:border-[#86b99b]"
                      }`}
                    >
                      <Image
                        src={item.url}
                        alt={item.name}
                        fill
                        unoptimized
                        sizes="(min-width: 640px) 128px, 30vw"
                        className="object-contain p-2"
                      />
                    </button>
                  ))}
                </div>
                {productPhotos.hasNextPage && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      busy || uploading || productPhotos.isFetchingNextPage
                    }
                    onClick={() => void productPhotos.fetchNextPage()}
                  >
                    {productPhotos.isFetchingNextPage
                      ? "Loading more photos…"
                      : "Show more photos"}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-xs text-[#5e6f63]">
                This product has no photos yet. Upload an image to feature it.
              </p>
            ))}
          {layout === "dialog" && (photoPreview || showEntryPhoto) && (
            <div className="relative h-40 overflow-hidden rounded-lg border bg-white">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Selected advert image"
                  fill
                  unoptimized
                  sizes="560px"
                  className="object-contain"
                />
              ) : entry && showEntryPhoto ? (
                <FeaturedImage
                  id={entry.id}
                  name={entry.productName || entry.caption}
                  product={entry.product}
                  photo={entry.photo}
                />
              ) : null}
            </div>
          )}
          <input
            ref={choosing}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose advert image"
            aria-describedby="featured-photo-error"
            className="sr-only"
            disabled={busy || uploading}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              if (!selected) return
              const parsed = featuredImageSchema.safeParse(selected)
              if (!parsed.success) {
                setImageError(parsed.error.issues[0].message)
                return
              }
              void prepare(parsed.data)
            }}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy || uploading}
              onClick={() => choosing.current?.click()}
            >
              {entry || file || photo
                ? "Upload a different image"
                : "Upload image"}
            </Button>
            {file && phase === "failed" && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void prepare(file)}
              >
                Retry image upload
              </Button>
            )}
          </div>
          {file && (
            <p className="text-sm font-medium break-all text-[#344e3d]">
              {file.name}
            </p>
          )}
          {file && (
            <p role="status" className="text-xs text-[#506858]">
              {phase === "preparing"
                ? "Preparing image…"
                : phase === "uploaded"
                  ? "Image uploaded. Save the featured product to finish."
                  : phase === "uploading"
                    ? "Uploading image…"
                    : "Image upload needs attention."}
            </p>
          )}
          <FieldError
            id="featured-photo-error"
            message={
              imageError || String(formState.errors.photo?.message ?? "")
            }
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="featured-caption" className="text-sm font-medium">
            Caption
          </label>
          <FormTextarea
            id="featured-caption"
            name="caption"
            required
            rows={3}
            disabled={busy}
            placeholder="What should customers know about this product?"
          />
        </div>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <FormInputField
            name="starts"
            label="Starts"
            type="datetime-local"
            required
            disabled={busy}
          />
          <FormInputField
            name="ends"
            label="Ends"
            type="datetime-local"
            required
            disabled={busy}
          />
        </div>
        <p className="text-xs text-[#5e6f63]">
          Times are in Africa/Lagos (UTC+1). The advert stops appearing on the
          storefront at the end time.
        </p>
        <FormInputField
          name="ordinal"
          label="Display order"
          type="number"
          inputMode="numeric"
          min={0}
          required
          disabled={busy}
          hint={
            entry
              ? "Lower numbers appear first. Change this to reorder the product."
              : nextPosition.isPending
                ? "Finding the next position…"
                : nextPosition.isError
                  ? "Could not suggest a position. Enter a number starting at 0."
                  : nextPosition.data.occupied.length
                    ? `Next position: ${nextPosition.data.next}, after position ${nextPosition.data.occupied.at(-1)}. Lower numbers appear first.`
                    : "Position 0 is first. New featured products will follow it."
          }
        />
        <FormError message={error} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy || uploading}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              busy ||
              uploading ||
              (Boolean(file) && phase !== "uploaded") ||
              !photo
            }
          >
            {copying
              ? "Preparing photo…"
              : busy
                ? "Saving…"
                : entry
                  ? "Save changes"
                  : "Create featured product"}
          </Button>
        </DialogFooter>
      </div>
      {layout === "page" && (
        <aside
          aria-label="Storefront preview"
          className="min-w-0 space-y-3 xl:sticky xl:top-28"
        >
          <h2 className="text-xs font-semibold tracking-[0.14em] text-[#5e6f63] uppercase">
            Storefront preview
          </h2>
          <div className="overflow-hidden rounded-xl border border-[#dfe7e1] bg-white">
            <div className="relative flex aspect-[4/3] items-center justify-center bg-[#edf5f0]">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt={productName || "Selected advert image"}
                  fill
                  unoptimized
                  sizes="(min-width: 1280px) 440px, 100vw"
                  className="object-contain p-5"
                />
              ) : entry && showEntryPhoto ? (
                <FeaturedImage
                  id={entry.id}
                  name={entry.productName || entry.caption}
                  product={entry.product}
                  photo={entry.photo}
                />
              ) : (
                <div className="space-y-3 text-center text-[#347451]">
                  <ImageIcon
                    aria-hidden
                    className="mx-auto size-8"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm">Your featured photo</p>
                </div>
              )}
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#5e6f63] uppercase">
                Featured product
              </p>
              <p className="text-xl leading-snug font-semibold break-words text-[#243e31] sm:text-2xl">
                {caption.trim() || "Your featured caption"}
              </p>
              {productName && (
                <p className="text-sm font-medium break-words text-[#344e3d]">
                  {productName}
                </p>
              )}
              <p className="text-sm text-[#5e6f63]">
                {vendorName || "Select a vendor to get started"}
              </p>
              {product ? (
                <Link
                  href={`/products/${encodeURIComponent(product)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[#087b4c] outline-none focus-visible:ring-2 focus-visible:ring-[#087b4c]"
                  aria-label="View product (opens in a new tab)"
                >
                  View product <ArrowUpRight aria-hidden className="size-4" />
                </Link>
              ) : (
                <p className="pt-2 text-xs text-[#5e6f63]">
                  Choose a product to preview its link.
                </p>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
