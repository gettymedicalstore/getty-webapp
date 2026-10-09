import type { Product } from "@/features/products/types/product"

export type CartItem = {
  variantId?: string
  purchasable?: boolean
  priceAvailable?: boolean
  lineSubtotal?: number | null
  minimum?: number
  productId: string
  quantity: number
  product: Product
}

export type Cart = {
  mode?: "remote" | "device"
  authenticated?: boolean
  expired?: boolean
  currency?: string | null
  items: CartItem[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
}
