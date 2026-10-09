import { getLiveProducts } from "./live-catalog"
export async function getProductsByCategory(category: string) {
  return (await getLiveProducts({ category })).items
}
