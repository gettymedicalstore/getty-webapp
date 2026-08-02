import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import CategoriesPageContent from "@/features/categories/components/store/categories-page-content"
import { categoriesQueryOptions } from "@/features/categories/api/category-query-options"
import { getQueryClient } from "@/lib/query/get-query-client"

export const metadata: Metadata = {
  title: "Medical Categories",
  description:
    "Browse all medical equipment, pharmaceutical and healthcare product categories.",
}

export default async function CategoriesPage() {
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery(categoriesQueryOptions())

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategoriesPageContent />
    </HydrationBoundary>
  )
}
