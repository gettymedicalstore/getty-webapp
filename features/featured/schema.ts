import { z } from "zod"

export const featuredStatuses = [
  "scheduled",
  "active",
  "expired",
  "closed",
] as const
export type FeaturedStatus = (typeof featuredStatuses)[number]
export type FeaturedEntry = {
  id: string
  tenant: string
  vendorName: string
  product: string
  productName: string
  photo: string
  caption: string
  starts: string
  ends: string
  ordinal: number
  status?: FeaturedStatus
}
export type Cursor = string | number
export type FeaturedPage<T> = {
  records: T[]
  nextCursor: Cursor | null
  isNext: boolean
}
export type FeaturedOption = { id: string; name: string }
const record = z.record(z.string(), z.unknown())
const text = (...values: unknown[]) =>
  values.find(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  ) ?? ""
const entity = (value: unknown) =>
  record.safeParse(value).success ? record.parse(value) : {}
const entityId = (value: unknown) =>
  text(typeof value === "string" ? value : entity(value).id)

// Lists and detail responses share the same normalization boundary.
export function parseFeaturedEntry(value: unknown): FeaturedEntry {
  const row = record.parse(value)
  const product = entity(row.product),
    tenant = entity(row.tenant)
  return {
    id: z.string().min(1).parse(row.id),
    product: z.string().min(1).parse(entityId(row.product)),
    tenant: entityId(row.tenant),
    productName: text(product.name, row.productName),
    vendorName: text(tenant.name, row.vendorName, row.tenantName),
    photo: entityId(row.photo),
    caption: text(row.caption),
    starts: text(row.starts),
    ends: text(row.ends),
    ordinal: z
      .number()
      .int()
      .nonnegative()
      .parse(row.ordinal ?? 0),
    status: z.enum(featuredStatuses).optional().parse(row.status),
  }
}
export function parseFeaturedPage<T>(
  value: unknown,
  map: (item: unknown) => T
): FeaturedPage<T> {
  const page = Array.isArray(value) ? { records: value } : record.parse(value)
  const records = z.array(z.unknown()).parse(page.records).map(map)
  const nextCursor = z
    .union([z.string().min(1), z.number().nonnegative()])
    .nullable()
    .parse(page.nextCursor ?? null)
  const isNext = z.boolean().parse(page.isNext ?? nextCursor !== null)
  if (isNext && nextCursor === null)
    throw new Error("The featured list is missing its next-page cursor.")
  return { records, nextCursor, isNext }
}
export function parseFeaturedOption(value: unknown): FeaturedOption {
  const row = record.parse(value)
  return {
    id: z.string().min(1).parse(row.id),
    name: z.string().min(1).parse(row.name),
  }
}
export function featuredStatus(
  entry: FeaturedEntry,
  now = Date.now()
): FeaturedStatus | "unknown" {
  if (entry.status === "closed") return "closed"
  const starts = Date.parse(entry.starts),
    ends = Date.parse(entry.ends)
  if (!Number.isFinite(starts) || !Number.isFinite(ends))
    return entry.status ?? "unknown"
  if (now >= ends) return "expired"
  return now < starts ? "scheduled" : "active"
}
// datetime-local is always interpreted as Africa/Lagos, independent of the browser zone.
export function lagosDateInput(value: string) {
  if (!Number.isFinite(Date.parse(value))) return ""
  return new Date(Date.parse(value) + 60 * 60 * 1000).toISOString().slice(0, 16)
}
export function lagosTimestamp(value: string) {
  return `${value}:00+01:00`
}
const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.")
  .refine(
    (value) => Number.isFinite(Date.parse(lagosTimestamp(value))),
    "Choose a valid date and time."
  )
export const featuredFormSchema = z
  .object({
    tenant: z.string().min(1, "Choose a vendor."),
    product: z.string().min(1, "Choose a published product."),
    photo: z.string().min(1, "Upload an advert image."),
    caption: z.string().trim().min(1, "Enter a caption."),
    starts: localDate,
    ends: localDate,
    ordinal: z
      .string()
      .regex(/^\d+$/, "Enter a whole number, zero or greater.")
      .transform(Number)
      .refine(Number.isSafeInteger, "Enter a smaller display order."),
  })
  .superRefine((data, ctx) => {
    const starts = Date.parse(lagosTimestamp(data.starts)),
      ends = Date.parse(lagosTimestamp(data.ends))
    if (ends <= starts)
      ctx.addIssue({
        code: "custom",
        path: ["ends"],
        message: "End time must be after the start time.",
      })
    if (ends <= Date.now())
      ctx.addIssue({
        code: "custom",
        path: ["ends"],
        message: "End time must be in the future.",
      })
  })
export type FeaturedFormValues = z.output<typeof featuredFormSchema>
export const featuredImageSchema = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Choose an image."
  )
  .refine(
    (file) =>
      file.size > 0 &&
      ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    "Choose a non-empty JPG, PNG or WebP image."
  )
