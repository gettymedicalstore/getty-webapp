import { apiData } from "@/lib/api/data"
import { apiRequest, GettyApiError, unavailable } from "@/lib/api/client"
import { z } from "zod"
type RecordItem = { id: string; [key: string]: unknown }
const paths: Record<string, string> = {
  products: "/getty/v1/product/products",
  categories: "/getty/v1/product/categories",
  taxes: "/getty/v1/product/taxes",
  profiles: "/getty/v1/tenant/profiles",
  suppliers: "/getty/v1/tenant/tenants",
  customers: "/getty/v1/tenant/tenants",
  inventory: "/getty/v1/inventory/variants",
}
function path(section: string) {
  if (!paths[section])
    unavailable(
      "This information is temporarily unavailable. Please contact support."
    )
  return paths[section]
}
function pageCursor(value: unknown, enabled?: boolean): string | null {
  if (enabled === false || value === null || value === undefined) return null
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : NaN
  if (
    !Number.isSafeInteger(number) ||
    number < 0 ||
    (number === 0 && enabled !== true)
  )
    return null
  return String(number)
}
function flattenCategories(
  records: RecordItem[],
  ancestors: string[] = [],
  parentId: string | null = null
): RecordItem[] {
  return records.flatMap((record) => {
    const name = String(record.name ?? "")
    const categoryPath = [...ancestors, name]
    return [
      {
        ...record,
        parent: record.parent ?? parentId,
        parentName: ancestors.at(-1) ?? null,
        categoryPath: categoryPath.join(" / "),
      },
      ...flattenCategories(
        Array.isArray(record.subcategories) ? record.subcategories : [],
        categoryPath,
        record.id
      ),
    ]
  })
}
export async function portalRecords(section: string, query = "") {
  const params = new URLSearchParams(query)
  if (section === "suppliers") params.set("type", "vendor")
  if (section === "customers") params.set("type", "customer")
  const suffix =
    ["categories", "taxes"].includes(section) || !params.size
      ? ""
      : `?${params}`
  const data = await apiData<
    | RecordItem[]
    | {
        records: RecordItem[]
        isNext?: boolean
        isPrevious?: boolean
        nextCursor?: string | number
        previousCursor?: string | number
        next?: string | number
        previous?: string | number
      }
  >(path(section) + suffix)
  if (Array.isArray(data))
    return {
      records: section === "categories" ? flattenCategories(data) : data,
      nextCursor: null,
      previousCursor: null,
    }
  if (!data || !Array.isArray(data.records))
    throw new GettyApiError("The record list is incomplete.")
  return {
    records:
      section === "categories" ? flattenCategories(data.records) : data.records,
    nextCursor: pageCursor(data.nextCursor ?? data.next, data.isNext),
    previousCursor: pageCursor(
      data.previousCursor ?? data.previous,
      data.isPrevious
    ),
  }
}
export async function portalProduct(id: string) {
  const data = await apiData<{
    product: RecordItem & { category: string }
    variants?: RecordItem[]
  }>(`${path("products")}/${encodeURIComponent(id)}`)
  if (!data?.product)
    throw new GettyApiError("The product details are incomplete.")
  const variant = data.variants?.find((item) => item.isDefault === true)
  return {
    record: {
      ...data.product,
      categoryId: data.product.category,
      ...(typeof variant?.price === "number" ? { price: variant.price } : {}),
      ...(typeof variant?.quantity === "number"
        ? { quantity: variant.quantity }
        : {}),
    },
  }
}
export async function portalTenant(id: string) {
  const data = await apiData<RecordItem>(
    `${path("suppliers")}/${encodeURIComponent(id)}`
  )
  if (!data?.id) throw new GettyApiError("The account details are incomplete.")
  return data
}
const taxInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1),
  rate: z.number().finite().min(0).max(100),
})
export async function changePortalRecord(
  section: string,
  method: string,
  input: Record<string, unknown>
) {
  if (
    !["products", "categories", "taxes"].includes(section) ||
    !["POST", "PATCH", "DELETE"].includes(method)
  )
    unavailable("This action is unavailable.")
  if (method === "DELETE") {
    if (typeof input.id !== "string" || !input.id)
      throw new GettyApiError("Select a record.", 400)
    return apiRequest(`${path(section)}/${encodeURIComponent(input.id)}`, {
      method,
    })
  }
  let body =
    section === "categories" && method === "POST"
      ? {
          parent: input.parent,
          categories: [{ name: input.name, description: input.description }],
        }
      : input
  if (section === "taxes") {
    const parsed = taxInput.safeParse(input)
    if (!parsed.success || (method === "PATCH" && !parsed.data.id))
      throw new GettyApiError(
        "Enter a tax name and a rate between 0 and 100%.",
        400
      )
    body =
      method === "POST"
        ? { name: parsed.data.name, rate: parsed.data.rate }
        : parsed.data
  }
  if (
    section === "categories" &&
    method === "POST" &&
    input.parent !== null &&
    (typeof input.parent !== "string" || !input.parent.trim())
  )
    throw new GettyApiError(
      "Choose a parent category or explicitly create a top-level category.",
      400
    )
  const result = await apiRequest<{ data?: unknown }>(path(section), {
    method,
    body: JSON.stringify(body),
  })
  if (Array.isArray(result.data)) {
    const failed = result.data.find(
      (item) =>
        typeof item?.status === "string" &&
        item.status.toLowerCase() !== "success"
    )
    if (failed)
      throw new GettyApiError(
        typeof failed.message === "string"
          ? failed.message
          : "The record could not be saved.",
        422
      )
  }
  return result
}
