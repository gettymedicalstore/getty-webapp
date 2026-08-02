import type { Product } from "@/features/products/types/product"

export type CartItem = {
  productId: string
  quantity: number
  product: Product
}

export type Cart = {
  items: CartItem[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
}
