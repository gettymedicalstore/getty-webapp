import "server-only"
import { cache } from "react"
import {
  getLiveCategories,
  getLiveProduct,
  getLiveProducts,
} from "../api/live-catalog"
export const serverCategories = cache(getLiveCategories)
export const serverProduct = cache(getLiveProduct)
export const serverProducts = getLiveProducts
export const serverCatalog = cache(
  async () => (await getLiveProducts({ limit: 12 })).items
)
