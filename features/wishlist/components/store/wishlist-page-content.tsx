"use client"

import { Heart } from "lucide-react"
import Link from "next/link"

import ProductGrid from "@/features/products/components/store/product-grid"

import { useWishlist } from "../../hooks/use-wishlist"

export default function WishlistPageContent() {
  const wishlist = useWishlist()

  return (
    <section className="bg-[#f7f7f7] py-12 sm:py-16">
      <div className="site-container">
        <h1 className="text-3xl font-extrabold">Wishlist</h1>

        {wishlist.isPending ? (
          <div className="mt-8 h-96 animate-pulse rounded-xl bg-black/5" />
        ) : wishlist.products.length === 0 ? (
          <div className="mt-8 rounded-xl bg-white px-6 py-16 text-center">
            <div className="bg-primary/10 text-primary mx-auto grid size-16 place-items-center rounded-full">
              <Heart className="size-7" />
            </div>

            <h2 className="mt-5 text-xl font-bold">Your wishlist is empty</h2>

            <Link
              href="/products"
              className="bg-primary mt-6 inline-flex rounded-md px-5 py-3 text-sm font-bold text-white"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <ProductGrid products={wishlist.products} />
          </div>
        )}
      </div>
    </section>
  )
}
