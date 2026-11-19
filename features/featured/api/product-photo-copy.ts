import type { ProductPhoto } from "@/lib/api/getty-contract"
import { GettyApiError } from "@/lib/api/client"
import {
  prepareProductImageUpload,
  uploadImageFile,
} from "@/features/admin/api/product-photos"

export type CataloguePhotoSelection = Pick<
  ProductPhoto,
  "id" | "name" | "mime" | "url"
> & { product: string }

export async function copyProductPhotoForFeatured(
  selected: CataloguePhotoSelection
) {
  let response: Response
  try {
    response = await fetch(selected.url, { credentials: "omit" })
  } catch {
    throw new GettyApiError(
      "Could not read this product photo. Try again or upload a different image."
    )
  }
  if (!response.ok)
    throw new GettyApiError(
      "Could not read this product photo. Try again or upload a different image.",
      response.status
    )
  const blob = await response.blob()
  const mime = response.headers.get("content-type")?.split(";")[0].trim()
  if (
    !blob.size ||
    !mime ||
    !["image/jpeg", "image/png", "image/webp"].includes(mime)
  )
    throw new GettyApiError("This product photo is not a usable image.", 502)
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[mime]
  const name = selected.name.replace(/\.[^.]+$/, "") || "product-photo"
  const file = new File([blob], `${name}.${extension}`, { type: mime })
  const target = await prepareProductImageUpload(file)
  return uploadImageFile(file, target)
}
