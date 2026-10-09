import {
  apiRequest as backendRequest,
  GettyApiError as BackendError,
} from "@/lib/api/client"
import { gettyUrl } from "@/lib/api/config"
import {
  GettyIdSchema,
  CatalogPageResponseSchema,
  ProductDetailResponseSchema,
  CategoriesResponseSchema,
  PhotoPageResponseSchema,
  type CatalogProduct,
} from "@/lib/api/getty-contract"
import type {
  Product,
  ProductFilters,
  ProductListResponse,
} from "../types/product"
import type { Category } from "@/features/categories/types/category"
const placeholder = "/images/product-placeholder.svg"
export const publicSlug = (name: string, id: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${id}`
export async function getProductThumbnail(id: string): Promise<string | null> {
  GettyIdSchema.parse(id)
  const result = PhotoPageResponseSchema.safeParse(
    await backendRequest(
      `/getty/ecommerce/catalog/products/${id}/photos?limit=1`,
      {},
      "public"
    )
  )
  if (!result.success)
    throw new BackendError("The product photos response is incomplete.")
  const photo = result.data.data.records[0]
  return photo
    ? gettyUrl(`/getty/ecommerce/catalog/products/${id}/photos/${photo.id}/src`)
    : null
}
function mapProduct(p: CatalogProduct): Product {
  const category = p.subcategory ?? p.category
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? undefined,
    slug: publicSlug(p.name, p.id),
    description: p.description ?? "",
    price: p.price,
    currency: p.currency,
    category: { ...category, slug: publicSlug(category.name, category.id) },
    image: placeholder,
    stock: 0,
    stockKnown: false,
    inStock: p.inStock,
    source: "remote",
    rating: p.rating.average ?? undefined,
    reviewCount: p.rating.count,
    active: true,
    createdAt: "",
  }
}
export async function getLiveCategories(): Promise<Category[]> {
  const parsed = CategoriesResponseSchema.safeParse(
    await backendRequest("/getty/ecommerce/catalog/categories", {}, "public")
  )
  if (!parsed.success)
    throw new BackendError("The categories response is incomplete.")
  return parsed.data.data
    .flatMap((c) => [
      c,
      ...c.subcategories.map((sub) => ({ ...sub, parentId: c.id })),
    ])
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: publicSlug(c.name, c.id),
      description: c.description ?? "",
      image: placeholder,
      active: true,
      productCount: 0,
      countKnown: false,
      parentId: "parentId" in c ? c.parentId : undefined,
    }))
}
export async function getLiveProducts(
  filters: ProductFilters
): Promise<ProductListResponse> {
  const limit = Math.min(100, Math.max(1, filters.limit ?? 12))
  if (filters.availability === "out-of-stock")
    throw new BackendError(
      "The public catalogue supports filtering available products only.",
      400
    )
  if (
    filters.minimumPrice !== undefined &&
    filters.maximumPrice !== undefined &&
    filters.minimumPrice > filters.maximumPrice
  )
    throw new BackendError("Minimum price must not exceed maximum price.", 400)
  const q = new URLSearchParams({
    limit: String(limit),
    currency: "NGN",
    cursor: String(filters.cursor ?? 0),
    navigation: filters.navigation ?? "next",
  })
  if (!Number.isSafeInteger(filters.cursor ?? 0) || (filters.cursor ?? 0) < 0)
    throw new BackendError("Invalid catalogue cursor.", 400)
  if (filters.search) q.set("search", filters.search.slice(0, 200))
  if (filters.category) {
    const category = (await getLiveCategories()).find(
      (c) => c.id === filters.category || c.slug === filters.category
    )
    if (!category) throw new BackendError("Category not found.", 404)
    q.set("category", category.id)
  }
  if (filters.minimumPrice !== undefined)
    q.set("minPrice", String(filters.minimumPrice))
  if (filters.maximumPrice !== undefined)
    q.set("maxPrice", String(filters.maximumPrice))
  if (filters.availability === "in-stock") q.set("inStock", "true")
  const result = CatalogPageResponseSchema.safeParse(
    await backendRequest(`/getty/ecommerce/catalog/products?${q}`, {}, "public")
  )
  if (!result.success)
    throw new BackendError("The catalogue response is incomplete.")
  const page = result.data.data
  // The public API only promises newest-first ordering and supplies no total count.
  return {
    items: page.records.map(mapProduct),
    pagination: {
      mode: "cursor",
      page: filters.page ?? 1,
      limit,
      total: page.records.length,
      totalPages: 0,
      nextCursor: page.nextCursor,
      previousCursor: page.previousCursor,
      hasNextPage: page.isNext,
      hasPreviousPage: page.isPrevious,
    },
  }
}
export async function getLiveProduct(slug: string): Promise<Product | null> {
  const id = slug.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  )?.[1]
  if (!id || !GettyIdSchema.safeParse(id).success) return null
  try {
    const result = ProductDetailResponseSchema.safeParse(
      await backendRequest(
        `/getty/ecommerce/catalog/products/${id}`,
        {},
        "public"
      )
    )
    if (!result.success)
      throw new BackendError("The product response is incomplete.")
    const p = result.data.data
    const photos = PhotoPageResponseSchema.safeParse(
      await backendRequest(
        `/getty/ecommerce/catalog/products/${id}/photos?limit=100`,
        {},
        "public"
      )
    )
    if (!photos.success)
      throw new BackendError("The product photos response is incomplete.")
    const images = photos.data.data.records.map((photo) =>
      gettyUrl(`/getty/ecommerce/catalog/products/${id}/photos/${photo.id}/src`)
    )
    return {
      ...mapProduct(p),
      image: images[0] ?? placeholder,
      images,
      variants: p.variants,
      detail: p.detail,
      specifications: p.specifications,
    }
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) return null
    throw error
  }
}
