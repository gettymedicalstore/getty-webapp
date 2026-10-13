import { GettyApiError } from "@/lib/api/client"
import { portalRecords } from "./portal"

// The authenticated Products endpoint is scoped to the current tenant.
// The All products endpoint includes other vendors and cannot establish ownership.
export async function isOwnProduct(product: string, name: string) {
  let cursor = "0"
  const visited = new Set<string>()
  while (!visited.has(cursor)) {
    visited.add(cursor)
    const params = new URLSearchParams({
      search: name,
      cursor,
      navigation: "next",
      limit: "50",
    })
    const page = await portalRecords("products", params.toString())
    if (page.records.some((record) => record.id === product)) return true
    if (page.nextCursor === null) return false
    cursor = page.nextCursor
  }
  throw new GettyApiError(
    "We couldn’t verify product ownership. Please try again."
  )
}
