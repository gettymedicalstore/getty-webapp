import { getLiveProducts } from "./live-catalog"
export const getProducts = getLiveProducts
export async function getFeaturedProducts(limit = 4) {
  return (await getLiveProducts({ limit, availability: "in-stock" })).items
}
export async function getRecentlyAddedProducts(limit = 4) {
  return (await getLiveProducts({ limit })).items
}
