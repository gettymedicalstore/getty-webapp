import { getLiveProducts, getLiveProduct } from "./live-catalog"
import {
  getPublicFeatured,
  featuredPhotoUrl,
} from "@/features/featured/api/featured"
import { featuredStatus } from "@/features/featured/schema"
export const getProducts = getLiveProducts
export async function getFeaturedProducts(limit = 4) {
  const entries = await getPublicFeatured(limit)
  const products = await Promise.all(
    entries
      .filter((entry) => ["active", "unknown"].includes(featuredStatus(entry)))
      .sort((a, b) => a.ordinal - b.ordinal)
      .map(async (entry) => {
        const product = await getLiveProduct(entry.product)
        return product
          ? { ...product, image: featuredPhotoUrl(entry.id) }
          : null
      })
  )
  return products.filter((product) => product !== null)
}
export async function getRecentlyAddedProducts(limit = 4) {
  return (await getLiveProducts({ limit })).items
}
