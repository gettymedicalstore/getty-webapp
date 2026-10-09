import { isStoredProduct } from "@/features/products/utils/stored-product"
import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import type { Wishlist } from "../types/wishlist"

export const WISHLIST_STORAGE_KEY = "getty-medical-store-wishlist"

export async function getWishlist(): Promise<Wishlist> {
  if (typeof window === "undefined") {
    return { products: [] }
  }

  try {
    const stored = window.localStorage.getItem(WISHLIST_STORAGE_KEY),
      parsed: unknown = stored ? JSON.parse(stored) : []
    return {
      products: Array.isArray(parsed)
        ? [
            ...new Map(
              parsed.filter(isStoredProduct).map((p) => [p.id, p])
            ).values(),
          ]
        : [],
    }
  } catch {
    return { products: [] }
  }
}

export function wishlistQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.wishlist.all,
    queryFn: getWishlist,
    staleTime: Infinity,
  })
}
