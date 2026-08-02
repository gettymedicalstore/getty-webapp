"use client"

import { Heart, ShoppingCart, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { MouseEvent } from "react"

import { useCart } from "@/features/cart/hooks/use-cart"
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist"

import type { Product } from "../../types/product"

type ProductCardProps = {
  product: Product
  isWishlisted?: boolean
  onAddToCart?: (product: Product) => void
  onToggleWishlist?: (product: Product) => void
}

export default function ProductCard({
  product,
  isWishlisted: controlledIsWishlisted,
  onAddToCart,
  onToggleWishlist,
}: ProductCardProps) {
  const cart = useCart()
  const wishlist = useWishlist()

  const rating = Math.min(5, Math.max(0, product.rating ?? 0))

  const isWishlisted = controlledIsWishlisted ?? wishlist.hasProduct(product.id)

  const isAvailable = product.stock > 0

  function handleAddToCart(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!isAvailable) return

    if (onAddToCart) {
      onAddToCart(product)
      return
    }

    cart.addProduct(product, 1)
  }

  function handleToggleWishlist(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (onToggleWishlist) {
      onToggleWishlist(product)
      return
    }

    wishlist.toggleProduct(product)
  }

  return (
    <article className="group font-geist flex h-full min-w-0 flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`View ${product.name}`}
        className="relative block aspect-square overflow-hidden rounded-md bg-white"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="
            (max-width: 640px) 50vw,
            (max-width: 768px) 50vw,
            (max-width: 1280px) 33vw,
            25vw
          "
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105 sm:p-5"
        />
      </Link>

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="flex min-w-0 items-baseline text-[#252B37]">
            <span className="mr-1 shrink-0 text-xs leading-none font-semibold">
              ₦
            </span>

            <span className="truncate text-lg leading-5 font-semibold tracking-[-0.02em]">
              {formatPrice(product.price)}
            </span>
          </p>

          {product.verified ? (
            <span className="flex h-[22px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-[#ECFDF3] px-2 py-0.5 text-center text-xs leading-[18px] font-medium text-[#027A48] mix-blend-multiply">
              Verified
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex min-h-[59px] flex-col gap-1">
          <Link href={`/products/${product.slug}`}>
            <h3 className="group-hover:text-primary line-clamp-2 text-sm leading-5 font-semibold text-[#414651] transition-colors">
              {product.name}
            </h3>
          </Link>

          <p className="line-clamp-2 text-xs leading-[18px] font-normal text-[#717680]">
            {product.description}
          </p>
        </div>

        <div className="mt-4 flex min-h-[18px] flex-wrap items-center gap-x-4 gap-y-2">
          <ProductRating rating={rating} />

          <div className="flex items-center text-xs leading-[18px] font-normal text-[#717680]">
            <span>{product.stock.toLocaleString("en-NG")} in stock</span>

            <span aria-hidden className="mx-2 text-[#A4A7AE]">
              |
            </span>

            <span>{(product.soldCount ?? 0).toLocaleString("en-NG")} sold</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable}
            aria-label={
              isAvailable
                ? `Add ${product.name} to cart`
                : `${product.name} is out of stock`
            }
            className="hover:border-primary hover:text-primary flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D5D7DA] bg-white px-4 text-sm leading-5 font-semibold text-[#414651] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart
              aria-hidden
              className="size-5 shrink-0"
              strokeWidth={1.8}
            />

            <span className="truncate">
              {isAvailable ? "Add to Cart" : "Out of Stock"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={
              isWishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            aria-pressed={isWishlisted}
            className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg border bg-white transition ${
              isWishlisted
                ? "border-primary text-primary"
                : "hover:border-primary hover:text-primary border-[#D5D7DA] text-[#535862]"
            }`}
          >
            <Heart
              aria-hidden
              className={`size-5 ${isWishlisted ? "fill-current" : ""}`}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>
    </article>
  )
}

function ProductRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex h-[18px] shrink-0 items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const isFilled = index < Math.round(rating)

        return (
          <Star
            key={index}
            aria-hidden
            className={`size-[11px] ${
              isFilled
                ? "fill-[#FACC15] text-[#FACC15]"
                : "fill-[#D1D5DB] text-[#D1D5DB]"
            }`}
            strokeWidth={1}
          />
        )
      })}
    </div>
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(price)
}
