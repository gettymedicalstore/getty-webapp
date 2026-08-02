import { mockProducts } from "../data/mock-products"
import type {
  Product,
  ProductFilters,
  ProductListResponse,
} from "../types/product"

function filterProducts(
  products: Product[],
  filters: ProductFilters
): Product[] {
  let result = [...products]

  if (filters.search) {
    const query = filters.search.trim().toLowerCase()

    result = result.filter((product) =>
      [product.name, product.description, product.category.name].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }

  if (filters.category) {
    const category = filters.category.trim().toLowerCase()

    result = result.filter(
      (product) =>
        product.category.slug.toLowerCase() === category ||
        product.category.id.toLowerCase() === category
    )
  }

  if (filters.minimumPrice !== undefined) {
    result = result.filter((product) => product.price >= filters.minimumPrice!)
  }

  if (filters.maximumPrice !== undefined) {
    result = result.filter((product) => product.price <= filters.maximumPrice!)
  }

  if (filters.availability === "in-stock") {
    result = result.filter((product) => product.stock > 0)
  }

  if (filters.availability === "out-of-stock") {
    result = result.filter((product) => product.stock <= 0)
  }

  result.sort((first, second) => {
    switch (filters.sort) {
      case "oldest":
        return (
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime()
        )

      case "price-low":
        return first.price - second.price

      case "price-high":
        return second.price - first.price

      case "trending":
        return (second.views ?? 0) - (first.views ?? 0)

      case "best-selling":
        return (second.soldCount ?? 0) - (first.soldCount ?? 0)

      case "newest":
      default:
        return (
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime()
        )
    }
  })

  return result
}

export async function getProducts(
  filters: ProductFilters
): Promise<ProductListResponse> {
  const page = Math.max(filters.page ?? 1, 1)
  const limit = Math.max(filters.limit ?? 12, 1)

  const activeProducts = mockProducts.filter((product) => product.active)

  const filteredProducts = filterProducts(activeProducts, {
    ...filters,
    page,
    limit,
    sort: filters.sort ?? "newest",
  })

  const total = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const currentPage = Math.min(page, totalPages)
  const offset = (currentPage - 1) * limit

  return {
    items: filteredProducts.slice(offset, offset + limit),

    pagination: {
      page: currentPage,
      limit,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  }
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return mockProducts
    .filter((product) => product.active && product.stock > 0)
    .sort((first, second) => {
      const firstScore =
        (first.soldCount ?? 0) * 3 +
        (first.views ?? 0) +
        (first.rating ?? 0) * 100

      const secondScore =
        (second.soldCount ?? 0) * 3 +
        (second.views ?? 0) +
        (second.rating ?? 0) * 100

      return secondScore - firstScore
    })
    .slice(0, limit)
}

export async function getRecentlyAddedProducts(limit = 4): Promise<Product[]> {
  return mockProducts
    .filter((product) => product.active && product.stock > 0)
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime()
    )
    .slice(0, limit)
}
