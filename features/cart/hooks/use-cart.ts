"use client"

import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { Product } from "@/features/products/types/product"
import { queryKeys } from "@/lib/query/query-keys"

import {
  calculateCart,
  CART_STORAGE_KEY,
  cartQueryOptions,
} from "../api/cart-query-options"
import type { Cart, CartItem } from "../types/cart"

type ClearCartOptions = {
  notify?: boolean
}

function getValidQuantity(value: number | null | undefined) {
  const quantity = Number(value)

  return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1
}

function getValidStock(value: number | null | undefined) {
  const stock = Number(value)

  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0
}

function normalizeCartItems(items: CartItem[]) {
  return items.map((item) => {
    const stock = getValidStock(item.product.stock)

    return {
      ...item,
      quantity: Math.min(getValidQuantity(item.quantity), Math.max(stock, 1)),
    }
  })
}

function persistCart(items: CartItem[]) {
  const normalizedItems = normalizeCartItems(items)

  try {
    if (normalizedItems.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY)
    } else {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(normalizedItems)
      )
    }
  } catch (error) {
    console.error("Unable to persist cart:", error)
    toast.error("Unable to save your cart.")
  }

  return calculateCart(normalizedItems)
}

export function useCart() {
  const queryClient = useQueryClient()
  const cartQuery = useQuery(cartQueryOptions())

  const getCurrentItems = useCallback(() => {
    return queryClient.getQueryData<Cart>(queryKeys.cart.all)?.items ?? []
  }, [queryClient])

  const commit = useCallback(
    (items: CartItem[]) => {
      const cart = persistCart(items)

      queryClient.setQueryData<Cart>(queryKeys.cart.all, cart)

      return cart
    },
    [queryClient]
  )

  const addProduct = useCallback(
    (product: Product, quantity = 1) => {
      const stock = getValidStock(product.stock)

      if (stock <= 0) {
        toast.error(`${product.name} is out of stock.`)
        return
      }

      const safeQuantity = Math.min(getValidQuantity(quantity), stock)

      const items = normalizeCartItems(getCurrentItems())

      const existingIndex = items.findIndex(
        (item) => item.productId === product.id
      )

      if (existingIndex >= 0) {
        const existingItem = items[existingIndex]

        items[existingIndex] = {
          ...existingItem,
          product,
          quantity: Math.min(
            stock,
            getValidQuantity(existingItem.quantity) + safeQuantity
          ),
        }
      } else {
        items.push({
          productId: product.id,
          product,
          quantity: safeQuantity,
        })
      }

      commit(items)
      toast.success(`${product.name} added to cart.`)
    },
    [commit, getCurrentItems]
  )

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const items = getCurrentItems().map((item) => {
        if (item.productId !== productId) {
          return item
        }

        const stock = getValidStock(item.product.stock)

        return {
          ...item,
          quantity: stock > 0 ? Math.min(getValidQuantity(quantity), stock) : 1,
        }
      })

      commit(items)
    },
    [commit, getCurrentItems]
  )

  const removeProduct = useCallback(
    (productId: string) => {
      const items = getCurrentItems()

      const removedItem = items.find((item) => item.productId === productId)

      if (!removedItem) {
        return
      }

      commit(items.filter((item) => item.productId !== productId))

      toast.success(`${removedItem.product.name} removed from cart.`)
    },
    [commit, getCurrentItems]
  )

  const clearCart = useCallback(
    async (options: ClearCartOptions = {}) => {
      const { notify = true } = options

      await queryClient.cancelQueries({
        queryKey: queryKeys.cart.all,
      })

      try {
        window.localStorage.removeItem(CART_STORAGE_KEY)
      } catch (error) {
        console.error("Unable to remove stored cart:", error)
        throw error
      }

      queryClient.setQueryData<Cart>(queryKeys.cart.all, calculateCart([]))

      if (notify) {
        toast.success("Cart cleared.")
      }
    },
    [queryClient]
  )

  return {
    cart: cartQuery.data ?? calculateCart([]),
    isPending: cartQuery.isPending,
    isError: cartQuery.isError,
    error: cartQuery.error,
    addProduct,
    updateQuantity,
    removeProduct,
    clearCart,
  }
}
