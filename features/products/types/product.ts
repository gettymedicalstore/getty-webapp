export type ProductStatus = "draft" | "active" | "out_of_stock" | "archived"

export type ProductSort =
  "newest" | "oldest" | "price-low" | "price-high" | "trending" | "best-selling"

export type ProductCategory = {
  id: string
  name: string
  slug: string
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compareAtPrice?: number
  image: string
  images?: string[]
  category: ProductCategory
  stock: number
  soldCount?: number
  views?: number
  rating?: number
  reviewCount?: number
  verified?: boolean
  active: boolean
  createdAt: string
  updatedAt?: string
}

export type ProductAvailability = "in-stock" | "out-of-stock"
export type ProductFilters = {
  page?: number

  limit?: number

  search?: string

  category?: string

  sort?: ProductSort

  minimumPrice?: number

  maximumPrice?: number

  availability?: ProductAvailability
}

export type PaginatedProducts = {
  items: Product[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ProductPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type ProductListResponse = {
  items: Product[]
  pagination: ProductPagination
}
