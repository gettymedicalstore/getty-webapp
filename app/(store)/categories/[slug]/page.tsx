import { notFound } from "next/navigation"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import {
  serverCategories,
  serverProducts,
} from "@/features/products/server/catalog-service"
import { productsQueryOptions } from "@/features/products/api/product-query-options"
import ProductsPageContent from "@/features/products/components/store/products-page-content"
import {
  normaliseProductFilters,
  type ProductSearchParams,
} from "@/features/products/utils/normalise-product-filters"
import { getQueryClient } from "@/lib/query/get-query-client"
type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<ProductSearchParams>
}
export async function generateMetadata({ params }: Props) {
  const { slug } = await params,
    category = (await serverCategories()).find((c) => c.slug === slug)
  return {
    title: category?.name ?? "Category not found",
    description: category?.description,
  }
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params,
    category = (await serverCategories()).find((c) => c.slug === slug)
  if (!category) notFound()
  const filters = normaliseProductFilters({
      ...(await searchParams),
      category: slug,
    }),
    client = getQueryClient()
  await client.prefetchQuery({
    ...productsQueryOptions(filters),
    queryFn: () => serverProducts(filters),
  })
  return (
    <HydrationBoundary state={dehydrate(client)}>
      <ProductsPageContent initialFilters={filters} />
    </HydrationBoundary>
  )
}
