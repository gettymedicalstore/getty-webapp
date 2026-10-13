import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { GettyApiError } from "@/lib/api/client"
import { gettyUrl } from "@/lib/api/config"
import { PhotoPageSchema, type PhotoPage } from "@/lib/api/getty-contract"

const id = z.string().trim().min(1)
const uploadMetadata = z.object({
  name: z.string().trim().min(1),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  extension: z.enum(["jpg", "jpeg", "png", "webp"]),
  size: z.number().int().positive(),
})

function photoLinkUrl(link: string, path: string) {
  const expected = new URL(gettyUrl(path))
  try {
    if (!link.trim()) throw new Error("Missing product photo link")
    const url = new URL(link, expected)
    if (
      url.origin !== expected.origin ||
      url.pathname !== expected.pathname ||
      url.username ||
      url.password ||
      url.hash
    )
      throw new Error("Invalid product photo link")
    return url
  } catch {
    throw new GettyApiError(
      "The product response contains an invalid photo link.",
      502
    )
  }
}

export async function getProductPhotoPage(
  product: string,
  photosLink?: string,
  cursor: PhotoPage["nextCursor"] = null
): Promise<PhotoPage> {
  const path = `/getty/ecommerce/catalog/products/${encodeURIComponent(id.parse(product))}/photos`
  const url = photoLinkUrl(photosLink ?? path, path)
  url.search = ""
  url.searchParams.set("limit", "24")
  const next = PhotoPageSchema.shape.nextCursor.parse(cursor)
  if (next) {
    url.searchParams.set("cursorEntry", next.entry)
    url.searchParams.set("cursorId", next.id)
  }
  const result = PhotoPageSchema.safeParse(
    await apiData(`${url.pathname}${url.search}`, {}, "public")
  )
  if (!result.success)
    throw new GettyApiError("The product photos response is incomplete.", 502)
  return {
    ...result.data,
    records: result.data.records.map((photo) => ({
      ...photo,
      url: photoLinkUrl(
        photo.url,
        `${path}/${encodeURIComponent(photo.id)}/src`
      ).href,
    })),
  }
}

export async function createProductPhotoUpload(
  metadata: z.input<typeof uploadMetadata>
) {
  const body = uploadMetadata.parse(metadata)
  return apiData<unknown>("/getty/v1/attachments/files", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function attachProductPhotos(product: string, files: string[]) {
  const body = z
    .object({ product: id, files: z.array(id).min(1) })
    .parse({ product, files })
  return apiData<unknown>("/getty/v1/product/products/photos", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export type UploadTarget = {
  id: string
  url: string
  method: "PUT" | "POST"
  headers: Record<string, string>
  fields: Record<string, string>
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function firstString(...values: unknown[]): string | null {
  return (
    (values.find((value) => typeof value === "string" && value.trim()) as
      string | undefined) ?? null
  )
}

function stringMap(value: unknown): Record<string, string> {
  const record = object(value)
  if (!record) return {}
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  )
}

export function productPhotoUploadTarget(response: unknown): UploadTarget {
  const payload = object(response)?.data ?? response
  const root = object(Array.isArray(payload) ? payload[0] : payload)
  const file = object(root?.file) ?? object(root?.attachment) ?? root
  const upload =
    object(root?.upload) ??
    object(root?.presigned) ??
    object(file?.upload) ??
    root
  const id = firstString(
    root?.file,
    file?.id,
    file?.fileId,
    root?.id,
    root?.fileId
  )
  const url = firstString(
    upload?.uploadUrl,
    upload?.upload_url,
    upload?.presignedUrl,
    upload?.signedUrl,
    upload?.url,
    root?.uploadUrl,
    root?.upload_url
  )
  if (!id || !url)
    throw new GettyApiError(
      "The upload service did not return a file ID and upload URL. Please try again or contact support.",
      502
    )
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new GettyApiError("The upload service returned an invalid URL.", 502)
  }
  if (parsedUrl.protocol !== "https:")
    throw new GettyApiError("The upload service returned an invalid URL.", 502)
  const method =
    firstString(upload?.method, root?.method)?.toUpperCase() ?? "PUT"
  if (method !== "PUT" && method !== "POST")
    throw new GettyApiError(
      "The upload service returned an unsupported method.",
      502
    )
  return {
    id,
    url: parsedUrl.href,
    method,
    headers: stringMap(upload?.headers ?? root?.headers),
    fields: stringMap(upload?.fields ?? root?.fields),
  }
}

function imageMetadata(file: File) {
  const extension = file.name.split(".").at(-1)?.toLowerCase()
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !extension ||
    !["jpg", "jpeg", "png", "webp"].includes(extension) ||
    file.size < 1
  )
    throw new GettyApiError("Choose a non-empty JPG, PNG or WebP image.", 400)
  return {
    name: file.name,
    mime: file.type as "image/jpeg" | "image/png" | "image/webp",
    extension: extension as "jpg" | "jpeg" | "png" | "webp",
    size: file.size,
  }
}

export async function prepareProductImageUpload(file: File) {
  return productPhotoUploadTarget(
    await createProductPhotoUpload(imageMetadata(file))
  )
}

export async function uploadImageFile(file: File, target: UploadTarget) {
  const multipart =
    target.method === "POST" && Object.keys(target.fields).length > 0
  const body = multipart ? new FormData() : file
  if (body instanceof FormData) {
    Object.entries(target.fields).forEach(([key, value]) =>
      body.append(key, value)
    )
    body.append("file", file)
  }
  const headers = { ...target.headers }
  if (
    target.method === "PUT" &&
    !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
  )
    headers["Content-Type"] = file.type
  const result = await fetch(target.url, {
    method: target.method,
    headers,
    body,
    credentials: "omit",
  })
  if (!result.ok)
    throw new GettyApiError(
      "The image could not be uploaded. Please try again.",
      result.status
    )
  return target.id
}

export async function uploadProductImages(
  product: string,
  files: File[],
  options: {
    preparedUploads?: ReadonlyMap<File, UploadTarget>
    uploadedFiles?: Map<File, string>
    onProgress?: (completed: number, total: number) => void
  } = {}
) {
  id.parse(product)
  if (!files.length)
    throw new GettyApiError("Choose at least one product image.", 400)
  // Validate the complete selection before starting any upload.
  files.forEach(imageMetadata)
  const uploaded = options.uploadedFiles ?? new Map<File, string>()
  // A selection prepared by the dialog must never initiate on confirmation.
  // Check every pending file before sending any image bytes to storage.
  if (options.preparedUploads) {
    for (const file of files) {
      if (!uploaded.has(file) && !options.preparedUploads.has(file))
        throw new GettyApiError(
          "An image is not ready to upload. Please prepare it again.",
          400
        )
    }
  }
  const fileIds: string[] = []
  options.onProgress?.(0, files.length)
  for (const file of files) {
    let fileId = uploaded.get(file)
    if (!fileId) {
      const target = options.preparedUploads
        ? options.preparedUploads.get(file)!
        : await prepareProductImageUpload(file)
      fileId = await uploadImageFile(file, target)
      uploaded.set(file, fileId)
    }
    fileIds.push(fileId)
    options.onProgress?.(fileIds.length, files.length)
  }
  // Attach the entire batch only after every selected file has uploaded.
  await attachProductPhotos(product, fileIds)
  return fileIds
}

export async function uploadProductImage(product: string, file: File) {
  return (await uploadProductImages(product, [file]))[0]
}
