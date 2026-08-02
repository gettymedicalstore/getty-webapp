import { mockProducts } from "@/features/products/data/mock-products"

import type { CheckoutItemInput } from "../types/payment"

export const DELIVERY_FEE_NAIRA = 1800

export type CalculatedCheckoutItem = {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type CalculatedCheckout = {
  items: CalculatedCheckoutItem[]
  subtotal: number
  deliveryFee: number
  total: number
  totalKobo: number
}

export function calculateCheckout(
  requestedItems: CheckoutItemInput[]
): CalculatedCheckout {
  if (!requestedItems.length) {
    throw new Error("Your cart is empty.")
  }

  const items = requestedItems.map((requestedItem) => {
    const product = mockProducts.find(
      (candidate) =>
        candidate.id === requestedItem.productId && candidate.active
    )

    if (!product) {
      throw new Error(`Product ${requestedItem.productId} is unavailable.`)
    }

    const quantity = Math.floor(Number(requestedItem.quantity))

    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for ${product.name}.`)
    }

    if (quantity > product.stock) {
      throw new Error(
        `Only ${product.stock} units of ${product.name} are available.`
      )
    }

    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity,
    }
  })

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  const deliveryFee = DELIVERY_FEE_NAIRA
  const total = subtotal + deliveryFee

  return {
    items,
    subtotal,
    deliveryFee,
    total,
    totalKobo: total * 100,
  }
}
