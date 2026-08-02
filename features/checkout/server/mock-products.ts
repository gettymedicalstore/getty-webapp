import { mockProducts } from "@/features/products/data/mock-products"

export function findMockProduct(productId: string) {
  const normalizedProductId = productId.trim()

  if (!normalizedProductId) {
    return null
  }

  const product = mockProducts.find((item) => item.id === normalizedProductId)

  if (!product || !product.active) {
    return null
  }

  return {
    id: product.id,
    name: product.name,
    priceKobo: Math.round(product.price * 100),
    stock: product.stock,
  }
}
