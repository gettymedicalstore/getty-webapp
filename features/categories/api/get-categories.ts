import { mockCategories } from "../data/mock-categories"

export async function getCategories() {
  return mockCategories.filter((category) => category.active)
}
