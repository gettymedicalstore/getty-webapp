import { productsQueryOptions } from "@/features/products/api/product-query-options"
import ProductsPageContent from "@/features/products/components/store/products-page-content"
import { serverProducts } from "@/features/products/server/catalog-service"
import {
  normaliseProductFilters,
  type ProductSearchParams,
} from "@/features/products/utils/normalise-product-filters"
import { getQueryClient } from "@/lib/query/get-query-client"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Medical Products",
  description:
    "Browse medical equipment, pharmaceutical products, consumables and healthcare essentials.",
}

type ProductsPageProps = {
  searchParams: Promise<ProductSearchParams>
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const resolvedSearchParams = await searchParams

  const filters = normaliseProductFilters(resolvedSearchParams)

  const queryClient = getQueryClient()

  await queryClient.prefetchQuery({
    ...productsQueryOptions(filters),
    queryFn: () => serverProducts(filters),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsPageContent initialFilters={filters} />
    </HydrationBoundary>
  )
}
