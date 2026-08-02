import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/query-keys"

import type { Cart, CartItem } from "../types/cart"

export const CART_STORAGE_KEY = "getty-medical-store-cart"

export function calculateCart(items: CartItem[]): Cart {
  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  )

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  const deliveryFee = 0
  const discount = 0

  return {
    items,
    itemCount,
    subtotal,
    deliveryFee,
    discount,
    total: subtotal + deliveryFee - discount,
  }
}

export async function getCart(): Promise<Cart> {
  if (typeof window === "undefined") {
    return calculateCart([])
  }

  const storedCart = window.localStorage.getItem(CART_STORAGE_KEY)

  if (!storedCart) {
    return calculateCart([])
  }

  try {
    const items = JSON.parse(storedCart) as CartItem[]

    return calculateCart(Array.isArray(items) ? items : [])
  } catch {
    return calculateCart([])
  }
}

export function cartQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.cart.all,
    queryFn: getCart,
    staleTime: Infinity,
  })
}
