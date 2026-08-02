import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getCategoryBySlug } from "@/features/categories/api/get-category-by-slug"
import { mockCategories } from "@/features/categories/data/mock-categories"
import ProductCard from "@/features/products/components/store/product-card"
import { getProductsByCategory } from "@/features/products/api/get-products-by-category"

type CategoryDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  return mockCategories
    .filter((category) => category.active)
    .map((category) => ({
      slug: category.slug,
    }))
}

export async function generateMetadata({
  params,
}: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return {
      title: "Category not found",
    }
  }

  return {
    title: category.name,
    description: category.description,
    openGraph: {
      title: category.name,
      description: category.description,
      images: category.image
        ? [
            {
              url: category.image,
              alt: category.name,
            },
          ]
        : [],
    },
  }
}

export default async function CategoryDetailPage({
  params,
}: CategoryDetailPageProps) {
  const { slug } = await params

  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductsByCategory(slug),
  ])

  if (!category) {
    notFound()
  }

  return (
    <main>
      <section className="border-b border-black/10 bg-[#f7faf8]">
        <div className="mx-auto grid w-full max-w-330 gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_320px] md:items-center lg:px-8 lg:py-14">
          <div>
            <nav
              aria-label="Breadcrumb"
              className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[#667085]"
            >
              <Link href="/" className="hover:text-primary transition">
                Home
              </Link>

              <span aria-hidden="true">/</span>

              <Link
                href="/categories"
                className="hover:text-primary transition"
              >
                Categories
              </Link>

              <span aria-hidden="true">/</span>

              <span className="text-[#101828]">{category.name}</span>
            </nav>

            <p className="text-primary text-sm font-semibold">
              Product category
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#101828] sm:text-4xl">
              {category.name}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[#535862]">
              {category.description}
            </p>

            <p className="mt-5 text-sm font-medium text-[#344054]">
              {products.length} {products.length === 1 ? "product" : "products"}{" "}
              available
            </p>
          </div>

          {category.image && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-sm">
              <Image
                src={category.image}
                alt={category.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover"
              />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-330 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#101828]">
              {category.name} products
            </h2>

            <p className="mt-2 text-sm text-[#667085]">
              Browse all available products in this category.
            </p>
          </div>

          <Link
            href="/products"
            className="text-primary text-sm font-semibold hover:underline"
          >
            View all products
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyCategory categoryName={category.name} />
        )}
      </section>
    </main>
  )
}

function EmptyCategory({ categoryName }: { categoryName: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-[#fafafa] px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-[#101828]">
        No products available
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
        There are currently no products available under {categoryName}.
      </p>

      <Link
        href="/products"
        className="bg-primary hover:bg-primary/90 mt-6 inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-semibold text-white transition"
      >
        Browse all products
      </Link>
    </div>
  )
}
