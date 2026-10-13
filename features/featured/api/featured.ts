import { queryOptions } from "@tanstack/react-query"
import { apiData } from "@/lib/api/data"
import { apiRequest, gettyClient, GettyApiError } from "@/lib/api/client"
import { gettyUrl } from "@/lib/api/config"
import { getVendorOptions } from "@/features/admin/api/accounts"
import {
  parseFeaturedEntry,
  parseFeaturedOption,
  parseFeaturedPage,
  lagosTimestamp,
  type Cursor,
  type FeaturedStatus,
  type FeaturedFormValues,
} from "../schema"

const root = "/getty/v1/featured"
export const featuredKeys = {
  all: ["featured"] as const,
  public: ["featured", "public"] as const,
}
export function featuredPhotoUrl(
  id: string,
  access: "public" | "admin" = "public"
) {
  return gettyUrl(
    `${access === "public" ? "/getty/ecommerce/featured" : root}/${encodeURIComponent(id)}/photo`
  )
}
export async function getFeaturedPage({
  cursor = 0,
  search = "",
  status = "",
}: { cursor?: Cursor; search?: string; status?: FeaturedStatus | "" } = {}) {
  const params = new URLSearchParams({ cursor: String(cursor), limit: "20" })
  if (search.trim()) params.set("search", search.trim())
  if (status) params.set("status", status)
  return parseFeaturedPage(
    await apiData(`${root}?${params}`),
    parseFeaturedEntry
  )
}
export async function getFeaturedEntry(id: string) {
  return parseFeaturedEntry(await apiData(`${root}/${encodeURIComponent(id)}`))
}
export async function getFeaturedOptions(
  kind: "vendors" | "products",
  tenant = ""
) {
  if (kind === "vendors") return getVendorOptions()
  if (kind === "products" && !tenant) throw new Error("Choose a vendor first.")
  const path = `/getty/v1/product/vendors/${encodeURIComponent(tenant)}/products/options`
  return parseFeaturedPage(await apiData(path), parseFeaturedOption).records
}
export async function saveFeatured(values: FeaturedFormValues, id?: string) {
  const result = await apiData(root, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify({
      ...values,
      ...(id ? { id } : {}),
      starts: lagosTimestamp(values.starts),
      ends: lagosTimestamp(values.ends),
    }),
  })
  // Create returns a per-entry decision inside the successful HTTP envelope.
  if (Array.isArray(result))
    for (const decision of result) {
      if (
        decision &&
        typeof decision === "object" &&
        "status" in decision &&
        decision.status !== "success"
      ) {
        throw new GettyApiError(
          typeof decision.message === "string"
            ? decision.message
            : "The featured product could not be saved."
        )
      }
    }
}
export async function deleteFeatured(id: string) {
  await apiRequest(`${root}/${encodeURIComponent(id)}`, { method: "DELETE" })
}
export async function getFeaturedPhotoBlob(id: string, signal?: AbortSignal) {
  const response = await gettyClient.request<Blob>({
    url: featuredPhotoUrl(id, "admin"),
    responseType: "blob",
    signal,
    transformResponse: [(value) => value],
  })
  if (
    !(response.data instanceof Blob) ||
    !response.data.type.startsWith("image/")
  )
    throw new GettyApiError("The advert image is not available yet.")
  return response.data
}
export async function getPublicFeatured(limit = 20) {
  return parseFeaturedPage(
    await apiData(`/getty/ecommerce/featured?limit=${limit}`, {}, "public"),
    parseFeaturedEntry
  ).records
}
export function publicFeaturedQueryOptions(limit = 20) {
  return queryOptions({
    queryKey: [...featuredKeys.public, limit],
    queryFn: () => getPublicFeatured(limit),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
