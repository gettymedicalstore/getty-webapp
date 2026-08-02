"use client"

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
  const queryClient = useQueryClient()
  const wishlistQuery = useQuery(wishlistQueryOptions())

  const products = wishlistQuery.data?.products ?? []

  function persist(nextProducts: Product[]) {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(nextProducts)
    )

    queryClient.setQueryData<Wishlist>(queryKeys.wishlist.all, {
      products: nextProducts,
    })
  }

  function hasProduct(productId: string) {
    return products.some((product) => product.id === productId)
  }

  function toggleProduct(product: Product) {
    if (hasProduct(product.id)) {
      persist(products.filter((item) => item.id !== product.id))
      toast.success(`${product.name} removed from wishlist`)
      return
    }

    persist([...products, product])
    toast.success(`${product.name} added to wishlist`)
  }

  return {
    products,
    isPending: wishlistQuery.isPending,
    hasProduct,
    toggleProduct,
  }
}
