import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { apiRequest, GettyApiError } from "@/lib/api/client"

const base = "/getty/v1/product/products"
const id = z.string().trim().min(1)
const text = z.string().trim().min(1)
const optionalText = z.string().trim().nullable()
const number = z.number().finite().nonnegative()
const record = z.looseObject({ id })
const detail = z.record(z.string(), z.unknown()).nullable()
const productSchema = z.object({
  product: z.looseObject({ id, name: text, status: z.string() }),
  category: z.looseObject({ id, name: z.string() }).nullable(),
  detail,
  variants: z.array(record),
  specifications: z.array(record),
  taxes: z.array(record),
  certificates: z.array(record),
  links: z
    .object({
      self: text.optional(),
      attachments: text.optional(),
      photos: text.optional(),
    })
    .optional(),
})
export type ManagedProduct = z.infer<typeof productSchema>
export type ProductRecord = z.infer<typeof record>
export type ProductResource = "detail" | "variants" | "specifications" | "taxes"

function validated<T>(
  schema: z.ZodType<T>,
  input: unknown,
  message: string,
  status = 400
): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw new GettyApiError(message, status)
  return parsed.data
}

function productPath(product: string) {
  return `${base}/${encodeURIComponent(validated(id, product, "Select a product."))}`
}

export async function getManagedProduct(
  product: string
): Promise<ManagedProduct> {
  const data = validated(
    productSchema,
    await apiData(productPath(product)),
    "The product response is incomplete.",
    502
  )
  if (data.product.id !== product)
    throw new GettyApiError("The requested product could not be verified.", 502)
  return data
}

export async function approveManagedProduct(product: string) {
  return mutate("/getty/v1/product/reviews/approve", "POST", {
    id: validated(id, product, "Select a product to approve."),
  })
}

export function getProductResource(
  product: string,
  resource: "detail"
): Promise<Record<string, unknown> | null>
export function getProductResource(
  product: string,
  resource: "variants" | "specifications" | "taxes"
): Promise<ProductRecord[]>
export async function getProductResource(
  product: string,
  resource: ProductResource
) {
  const data = await apiData(`${productPath(product)}/${resource}`)
  return resource === "detail"
    ? validated(
        detail,
        data,
        "The product details response is incomplete.",
        502
      )
    : validated(
        z.array(record),
        data,
        "The product records response is incomplete.",
        502
      )
}

const specificationInput = z.object({
  product: id,
  id: id.optional(),
  name: text,
  value: text,
  unit: optionalText,
  ordinal: number.int(),
})
const detailsInput = z.object({
  product: id,
  manufacturer: optionalText,
  model: optionalText,
  origin: optionalText,
  usage: optionalText,
  instructions: optionalText,
  warnings: optionalText,
  sterile: z.boolean().nullable(),
  disposable: z.boolean().nullable(),
  coldchain: z.boolean().nullable(),
  shelflife: number.nullable(),
  warranty: number.nullable(),
  dispatch: number.nullable(),
})
const variantInput = z.object({
  product: id,
  id: id.optional(),
  sku: text,
  name: text,
  isDefault: z.boolean(),
  active: z.boolean(),
  options: z.record(text, text),
  price: number,
  saleUnit: text,
  unitsPerPack: number.int().min(1),
  minimumOrderQuantity: number.int().min(1),
  barcode: optionalText.optional(),
  weightKg: number.nullable().optional(),
  lengthCm: number.nullable().optional(),
  widthCm: number.nullable().optional(),
  heightCm: number.nullable().optional(),
})
const taxInput = z.object({ product: id, tax: id })
const overviewInput = z.object({
  id,
  name: text,
  brand: z.string().trim(),
  category: id,
  description: text,
  currency: z.string().length(3),
  price: number,
  quantity: number.int(),
})

async function mutate(path: string, method: string, input?: unknown) {
  const result = await apiRequest<{ data?: unknown }>(path, {
    method,
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
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
          : "The product could not be saved.",
        422
      )
  }
  return result
}

export async function saveProductOverview(
  product: string,
  fields: Record<string, unknown>,
  status?: "draft"
) {
  const body = validated(
    overviewInput,
    { ...fields, id: product },
    "Enter the product name, category, description, price and stock quantity."
  )
  return mutate(base, "PATCH", status === "draft" ? { ...body, status } : body)
}

export async function submitManagedProductForReview(data: ManagedProduct) {
  if (data.product.status.toLowerCase() !== "draft")
    throw new GettyApiError(
      "Only draft products can be submitted for review.",
      400
    )
  const variant = data.variants.find((item) => item.isDefault === true)
  const body = validated(
    overviewInput,
    {
      id: data.product.id,
      name: data.product.name,
      brand: data.product.brand ?? "",
      category: data.category?.id ?? data.product.category,
      description: data.product.description,
      currency: data.product.currency,
      price: variant?.price,
      quantity: variant?.quantity,
    },
    "Complete the product name, category, description, price and stock quantity before submitting."
  )
  return mutate(base, "PATCH", { ...body, status: "pending" })
}

export async function saveProductResource(
  product: string,
  resource: ProductResource,
  method: "POST" | "PATCH",
  fields: Record<string, unknown>
) {
  const schema = {
    detail: detailsInput,
    specifications: specificationInput,
    variants: variantInput,
    taxes: taxInput,
  }[resource]
  if (resource === "taxes" && method !== "POST")
    throw new GettyApiError("Select a tax to assign.", 400)
  if (method === "PATCH" && ["specifications", "variants"].includes(resource))
    validated(id, fields.id, "Select the record to edit.")
  const body = validated(
    schema as z.ZodType,
    { ...fields, product },
    "Check the required fields and numeric values."
  )
  return mutate(`${base}/${resource}`, method, body)
}

export async function deleteProductResource(
  product: string,
  resource: ProductResource,
  recordId?: string
) {
  const suffix =
    resource === "detail"
      ? ""
      : `/${encodeURIComponent(validated(id, recordId, "Select the record to delete."))}`
  return mutate(`${productPath(product)}/${resource}${suffix}`, "DELETE")
}
