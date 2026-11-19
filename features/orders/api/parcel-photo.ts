import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { GettyApiError } from "@/lib/api/client"
import { gettyUrl } from "@/lib/api/config"
import {
  productPhotoUploadTarget,
  uploadImageFile,
} from "@/features/admin/api/product-photos"

const supportedTypes: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
}

export async function uploadParcelPhoto(
  orderId: string,
  file: File,
  onStage?: (stage: "uploading" | "verifying") => void
) {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? ""
  if (!file.size || !supportedTypes[file.type]?.includes(extension))
    throw new GettyApiError(
      "Choose a non-empty JPG, PNG, WebP or GIF image.",
      400
    )

  const upload = productPhotoUploadTarget(
    await apiData<unknown>("/getty/v1/attachments/files", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        mime: file.type,
        extension,
        size: file.size,
      }),
    })
  )
  onStage?.("uploading")
  await uploadImageFile(file, upload)
  onStage?.("verifying")
  const reconciliation = await apiData<unknown>(
    `/getty/v1/attachments/files/${encodeURIComponent(upload.id)}/reconcile`,
    {
      method: "POST",
      body: JSON.stringify({
        ownerType: "order-parcel",
        ownerId: orderId,
        purpose: "parcel-photo",
      }),
    }
  )
  if (
    !z.object({ newStatus: z.literal("verified") }).safeParse(reconciliation)
      .success
  )
    throw new GettyApiError(
      "The parcel photo has not been verified. Please try the upload again.",
      502
    )
  return upload.id
}

export async function getParcelPhotoUrl(
  orderId: string,
  accessPath: string
): Promise<string> {
  const expected = new URL(
    gettyUrl(`/getty/v1/order/${encodeURIComponent(orderId)}/parcel-photo`)
  )
  let actual: URL
  try {
    actual = new URL(accessPath, expected)
  } catch {
    throw new GettyApiError("The parcel photo link is invalid.", 502)
  }
  if (
    actual.origin !== expected.origin ||
    actual.pathname !== expected.pathname ||
    actual.username ||
    actual.password ||
    actual.hash
  )
    throw new GettyApiError("The parcel photo link is invalid.", 502)
  const response = z
    .object({ url: z.url() })
    .parse(await apiData(`${actual.pathname}${actual.search}`))
  const signed = new URL(response.url)
  if (signed.protocol !== "https:")
    throw new GettyApiError("The parcel photo URL is invalid.", 502)
  return signed.href
}

export const fulfilmentHistoryAction = {
  placed: "placed",
  preparing: "fulfilment-preparing",
  ready: "fulfilment-ready",
  dispatched: "fulfilment-dispatch",
  delivered: "fulfilment-deliver",
} as const
