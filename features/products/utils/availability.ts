import type { Product } from "../types/product"
export const isProductInStock = (product: Product) =>
  product.inStock ?? product.stock > 0
export const productMaximum = (product: Product) =>
  product.stockKnown === false ? 2147483647 : product.stock
export const productMinimum = (product: Product) =>
  product.minimumOrderQuantity ?? 1
