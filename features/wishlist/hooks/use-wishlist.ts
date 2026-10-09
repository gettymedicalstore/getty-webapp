"use client"

import { useHydrated } from "@/lib/use-hydrated"
import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { Product } from "@/features/products/types/product"
import { queryKeys } from "@/lib/query/query-keys"

import {
  WISHLIST_STORAGE_KEY,
  wishlistQueryOptions,
} from "../api/wishlist-query-options"
import type { Wishlist } from "../types/wishlist"

export function useWishlist() {
  const hydrated = useHydrated()
  const queryClient = useQueryClient()
  const wishlistQuery = useQuery(wishlistQueryOptions())

  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === WISHLIST_STORAGE_KEY || e.key === null)
        void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all })
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [queryClient])

  const products = hydrated ? (wishlistQuery.data?.products ?? []) : []

  function persist(nextProducts: Product[]) {
    try {
      window.localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify(nextProducts)
      )
    } catch {
      toast.error("Unable to save your wishlist on this device.")
      return false
    }
    void queryClient.cancelQueries({ queryKey: queryKeys.wishlist.all })
    queryClient.setQueryData<Wishlist>(queryKeys.wishlist.all, {
      products: nextProducts,
    })
    return true
  }

  function hasProduct(productId: string) {
    return products.some((product) => product.id === productId)
  }

  function toggleProduct(product: Product) {
    const current =
      queryClient.getQueryData<Wishlist>(queryKeys.wishlist.all)?.products ??
      products
    if (current.some((p) => p.id === product.id)) {
      if (!persist(current.filter((item) => item.id !== product.id))) return
      toast.success(`${product.name} removed from wishlist`)
      return
    }

    if (!persist([...current, product])) return
    toast.success(`${product.name} added to wishlist`)
  }

  return {
    products,
    isPending: !hydrated || wishlistQuery.isPending,
    hasProduct,
    toggleProduct,
  }
}
