import { serverProduct as getProduct } from "@/features/products/server/catalog-service"
import type { Metadata } from "next"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { productQueryOptions } from "@/features/products/api/get-product"
import ProductDetails from "@/features/products/components/store/product-details"
import { getQueryClient } from "@/lib/query/get-query-client"

type ProductDetailsPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params,
}: ProductDetailsPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
    }
  }

  const description = product.description.slice(0, 160)

  return {
    title: product.name,
    description,

    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.image
        ? [
            {
              url: product.image,
              alt: product.name,
            },
          ]
        : [],
    },

    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: product.image ? [product.image] : [],
    },
  }
}

export default async function ProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const { slug } = await params

  const queryClient = getQueryClient()

  const product = await queryClient.fetchQuery({
    ...productQueryOptions(slug),
    queryFn: () => getProduct(slug),
  })

  if (!product) {
    notFound()
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductDetails slug={slug} />
    </HydrationBoundary>
  )
}
