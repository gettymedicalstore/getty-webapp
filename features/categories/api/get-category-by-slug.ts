import { mockCategories } from "../data/mock-categories"

export async function getCategoryBySlug(slug: string) {
  return (
    mockCategories.find(
      (category) => category.slug === slug && category.active
    ) ?? null
  )
}
