"use client"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, ImageIcon, UploadCloud } from "lucide-react"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
  FormTextarea,
  FieldError,
} from "@/components/shared/form/validated-form"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import {
  fieldClass,
  FormError,
} from "@/features/admin/components/product-workspace-shared"
import {
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
import { getFeaturedOptions } from "../api/featured"
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
        ordinal: String(entry?.ordinal ?? 0),
      }}
      onSubmit={onSave}
      className="space-y-5"
    >
      <Fields
        entry={entry}
        layout={layout}
        busy={busy}
        error={error}
        onCancel={onCancel}
        onUploadBusy={onUploadBusy}
      />
    </ValidatedForm>
  )
}
function Fields({
  entry,
  layout = "dialog",
  busy,
  error,
  onCancel,
  onUploadBusy,
}: {
  entry?: FeaturedEntry
  layout?: "dialog" | "page"
  busy: boolean
  error: string
  onCancel: () => void
  onUploadBusy: (busy: boolean) => void
}) {
  const { setValue, formState } = useFormContext()
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
  const [target, setTarget] = useState<UploadTarget | null>(null)
  const [phase, setPhase] = useState<
    "idle" | "preparing" | "ready" | "uploading" | "uploaded" | "failed"
  >("idle")
  const [imageError, setImageError] = useState("")
  const generation = useRef(0)
  const choosing = useRef<HTMLInputElement>(null)
  const uploading = phase === "preparing" || phase === "uploading"
  useEffect(() => {
    onUploadBusy(uploading)
  }, [uploading, onUploadBusy])
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
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setTarget(null)
    setImageError("")
    setPhase("preparing")
    setValue("photo", "", { shouldDirty: true })
    try {
      const next = await prepareProductImageUpload(selected)
      if (run === generation.current) {
        setTarget(next)
        setPhase("ready")
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
  async function upload() {
    if (!file || !target || uploading) return
    const run = generation.current
    setPhase("uploading")
    setImageError("")
    try {
      const id = await uploadImageFile(file, target)
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
              onChange={() => setValue("product", "", { shouldDirty: true })}
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
              Use a dedicated JPG, PNG or WebP image for this featured product.
            </p>
          </div>
          {layout === "dialog" && (preview || entry) && (
            <div className="relative h-40 overflow-hidden rounded-lg border bg-white">
              {preview ? (
                <Image
                  src={preview}
                  alt="Selected advert image"
                  fill
                  unoptimized
                  sizes="560px"
                  className="object-contain"
                />
              ) : entry ? (
                <FeaturedImage
                  id={entry.id}
                  name={entry.productName || entry.caption}
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
              {entry || file ? "Change image" : "Choose image"}
            </Button>
            {file && phase !== "uploaded" && (
              <Button
                type="button"
                disabled={busy || uploading || !target}
                onClick={() => void upload()}
              >
                <UploadCloud aria-hidden className="size-4" />
                {phase === "uploading" ? "Uploading…" : "Upload image"}
              </Button>
            )}
            {file && phase === "failed" && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void prepare(file)}
              >
                Prepare again
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
                : phase === "ready"
                  ? "Ready. Upload the image before saving."
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
          required
          disabled={busy}
          hint="Lower numbers appear first, starting at 0."
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
            {busy
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
              {preview ? (
                <Image
                  src={preview}
                  alt={productName || "Selected advert image"}
                  fill
                  unoptimized
                  sizes="(min-width: 1280px) 440px, 100vw"
                  className="object-contain p-5"
                />
              ) : entry ? (
                <FeaturedImage
                  id={entry.id}
                  name={entry.productName || entry.caption}
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
