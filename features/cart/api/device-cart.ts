import type { Product } from "@/features/products/types/product"
import type { Cart, CartItem } from "../types/cart"
import { liveCart } from "./live-cart"

export const DEVICE_CART_KEY = "getty-device-cart-v1"
const changeEvent = "getty-device-cart-change"

export function deviceCartSnapshot() {
  try {
    return window.localStorage.getItem(DEVICE_CART_KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

export function subscribeDeviceCart(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DEVICE_CART_KEY || event.key === null) onChange()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(changeEvent, onChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(changeEvent, onChange)
  }
}

export function parseDeviceItems(snapshot: string): CartItem[] {
  try {
    const rows: unknown = JSON.parse(snapshot)
    if (!Array.isArray(rows)) return []
    return rows.flatMap((row): CartItem[] => {
      if (!row || typeof row !== "object") return []
      const item = row as Partial<CartItem>
      const product = item.product as Partial<Product> | undefined
      if (
        !product ||
        typeof item.variantId !== "string" ||
        typeof product.id !== "string" ||
        typeof product.slug !== "string" ||
        typeof product.name !== "string" ||
        typeof product.image !== "string" ||
        typeof product.price !== "number" ||
        !Number.isFinite(product.price) ||
        typeof item.quantity !== "number" ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      )
        return []
      return [
        {
          productId: product.id,
          variantId: item.variantId,
          quantity: item.quantity!,
          minimum: Math.max(1, product.minimumOrderQuantity ?? 1),
          product: {
            ...product,
            variantId: item.variantId,
            category: product.category ?? {
              id: "",
              name: "Medical supplies",
              slug: "",
            },
            description: product.description ?? "",
            stock: product.stock ?? 0,
            active: product.active ?? true,
            createdAt: product.createdAt ?? "",
          } as Product,
        },
      ]
    })
  } catch {
    return []
  }
}

export function readDeviceItems() {
  return parseDeviceItems(deviceCartSnapshot())
}

export function saveDeviceItems(items: CartItem[]) {
  try {
    window.localStorage.setItem(DEVICE_CART_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event(changeEvent))
    return true
  } catch {
    return false
  }
}

export function deviceCart(items: CartItem[]): Cart {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  return {
    mode: "device",
    authenticated: false,
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal,
    deliveryFee: 0,
    discount: 0,
    total: subtotal,
  }
}

export async function loadBuyerCart() {
  let current = await liveCart()
  for (const item of readDeviceItems()) {
    const variant = item.variantId
    if (!variant) continue
    const existing = current.items.find((row) => row.variantId === variant)
    const quantity = Math.max(existing?.quantity ?? 0, item.quantity)
    if (quantity !== existing?.quantity)
      current = await liveCart("PUT", variant, { quantity })
    if (
      !saveDeviceItems(
        readDeviceItems().filter((row) => row.variantId !== variant)
      )
    )
      throw new Error("Your saved bag could not be updated on this device.")
  }
  return current
}
