import { z } from "zod"
import { apiData } from "@/lib/api/data"

export const allProductFiltersSchema = z.object({
  vendor: z.string(),
  status: z.enum(["", "draft", "pending", "published", "rejected"]),
  search: z.string().trim(),
})
export type AllProductFilters = z.infer<typeof allProductFiltersSchema>
const cursorSchema = z.union([
  z.number().int().nonnegative(),
  z.string().min(1),
])
export type ProductCursor = z.infer<typeof cursorSchema>
const count = z.number().int().nonnegative().nullish()
const money = z.number().nonnegative().nullish()
export const allProductsPageSchema = z
  .object({
    records: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        vendor: z.string().nullish(),
        category: z.string().nullish(),
        categoryName: z.string().nullish(),
        brand: z.string().nullish(),
        currency: z.string().nullish(),
        status: z.string(),
        price: money,
        priceFmt: z.string().nullish(),
        discount: money,
        discountFmt: z.string().nullish(),
        quantity: count,
        availableQuantity: count,
        variantCount: count,
        cursor: cursorSchema.optional(),
      })
    ),
    cursor: cursorSchema,
    nextCursor: cursorSchema.nullable(),
    previousCursor: cursorSchema.nullable(),
    isNext: z.boolean(),
    isPrevious: z.boolean(),
  })
  .superRefine((page, ctx) => {
    for (const [enabled, key] of [
      [page.isNext, "nextCursor"],
      [page.isPrevious, "previousCursor"],
    ] as const) {
      if (enabled && page[key] === null)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "The product list is missing a page cursor.",
        })
    }
  })
export type AllVendorProduct = z.infer<
  typeof allProductsPageSchema
>["records"][number]

export async function getAllProducts({
  vendor = "",
  status = "",
  search = "",
  cursor = 0,
  navigation = "next",
  limit = 20,
}: Partial<AllProductFilters> & {
  cursor?: ProductCursor
  navigation?: "next" | "previous"
  limit?: number
} = {}) {
  const params = new URLSearchParams({
    cursor: String(cursor),
    navigation,
    limit: String(limit),
  })
  if (vendor) params.set("vendor", vendor)
  if (status) params.set("status", status)
  if (search.trim()) params.set("search", search.trim())
  return allProductsPageSchema.parse(
    await apiData(`/getty/v1/product/products/all?${params}`)
  )
}
