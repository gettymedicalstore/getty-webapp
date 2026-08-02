"use client"

import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import Link from "next/link"

import { categoriesQueryOptions } from "../../api/category-query-options"

export default function CategoriesPageContent() {
  const categoriesQuery = useQuery(categoriesQueryOptions())

  return (
    <section className="bg-white py-10 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-330 px-4 lg:px-6 xl:px-0">
        <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
          Product departments
        </p>

        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          Medical Categories
        </h1>

        {categoriesQuery.isPending ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-1.5/1 animate-pulse rounded-xl bg-black/5"
              />
            ))}
          </div>
        ) : categoriesQuery.isError ? (
          <div className="mt-10 rounded-xl bg-white px-6 py-16 text-center">
            Categories could not be loaded.
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesQuery.data.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative aspect-1.5/1 overflow-hidden rounded-xl bg-[#e7eae9]"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h2 className="text-lg font-bold">{category.name}</h2>
                  <p className="mt-1 text-xs text-white/70">
                    {category.productCount} products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
