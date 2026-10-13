"use client"
import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useCart } from "@/features/cart/hooks/use-cart"
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist"
import {
  isProductInStock,
  productMaximum,
  productMinimum,
} from "../../utils/availability"
import { productQueryOptions } from "../../api/get-product"
import type { Product } from "../../types/product"
import ProductCardImage from "./product-card-image"
import ProductPrice from "./product-price"
import {
  productPricing,
  selectProductVariant,
} from "../../utils/product-pricing"
type Props = {
  product: Product
  isWishlisted?: boolean
  onAddToCart?: (product: Product) => void
  onToggleWishlist?: (product: Product) => void
}
export default function ProductCard({
  product,
  isWishlisted: controlled,
  onAddToCart,
  onToggleWishlist,
}: Props) {
  const cart = useCart(),
    queryClient = useQueryClient(),
    wishlist = useWishlist(),
    saved = controlled ?? wishlist.hasProduct(product.id),
    available = isProductInStock(product),
    choose = product.source === "remote" && !product.variantId,
    line = cart.cart.items.find((item) => item.productId === product.id)
  const [adding, setAdding] = useState(false)
  const pricing = productPricing(product.price, product.compareAtPrice)
  async function add() {
    if (!available) return
    setAdding(true)
    try {
      let selected = product
      if (choose) {
        const detail = await queryClient.fetchQuery(
          productQueryOptions(product.slug)
        )
        const variant =
          detail?.variants?.find((item) => item.isDefault && item.inStock) ??
          detail?.variants?.find((item) => item.inStock)
        if (!detail || !variant)
          throw new Error("This product has no available option.")
        selected = selectProductVariant(detail, variant)
      }
      if (onAddToCart) onAddToCart(selected)
      else await cart.addProduct(selected, productMinimum(selected))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add this product."
      )
    } finally {
      setAdding(false)
    }
  }
  const minimum = line?.minimum ?? productMinimum(line?.product ?? product)
  const maximum = line ? productMaximum(line.product) : productMaximum(product)
  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#e2e5eb] bg-white transition-colors hover:border-[#aabbb0]">
      <div className="relative">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`View ${product.name}`}
          className="relative block h-44 overflow-hidden bg-white sm:h-48"
        >
          <ProductCardImage
            product={product}
            sizes="(max-width:639px) 90vw,(max-width:1023px) 46vw,310px"
            className="p-4 sm:p-5"
          />
        </Link>
        <button
          type="button"
          onClick={() =>
            onToggleWishlist
              ? onToggleWishlist(product)
              : wishlist.toggleProduct(product)
          }
          aria-pressed={saved}
          aria-label={`${saved ? "Remove" : "Save"} ${product.name}${saved ? " from wishlist" : " to wishlist"}`}
          className={`absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-[#e2e5eb] bg-white/95 transition hover:border-[#086b43] hover:bg-[#f1f8f4] ${saved ? "text-primary" : "text-[#475467]"}`}
        >
          <Heart
            className={`size-5 ${saved ? "fill-current" : ""}`}
            aria-hidden
          />
        </button>
        {pricing.saving > 0 && (
          <span className="pointer-events-none absolute top-4 left-4 rounded bg-[#174e35] px-2 py-1 text-xs font-semibold text-white">
            {pricing.percent > 0 ? `${pricing.percent}% off` : "Sale"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 pt-2 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <ProductPrice
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            currency={product.currency}
          />
          {product.verified && (
            <span className="rounded-full bg-[#ecfdf3] px-2 py-1 text-xs font-medium text-[#087443]">
              Verified
            </span>
          )}
        </div>
        <Link href={`/products/${product.slug}`} className="mt-2.5">
          <h3 className="group-hover:text-primary line-clamp-2 text-sm leading-5 font-semibold text-[#344054]">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#667085]">
          {product.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#667085]">
          <span
            className="inline-flex items-center gap-0.5"
            role="img"
            aria-label={
              (product.reviewCount ?? 0) > 0 && product.rating != null
                ? `${product.rating.toFixed(1)} out of 5 stars, ${product.reviewCount} reviews`
                : "No reviews yet"
            }
          >
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                aria-hidden
                className={`size-3.5 ${(product.reviewCount ?? 0) > 0 && index < Math.round(product.rating ?? 0) ? "fill-[#f4b400] text-[#f4b400]" : "text-[#98a2b3]"}`}
              />
            ))}
          </span>
          <span>
            {available
              ? product.stockKnown !== false
                ? `${product.stock} in stock`
                : "In stock"
              : "Out of stock"}
          </span>
          {product.soldCount != null && (
            <span className="border-l border-[#d0d5dd] pl-3">
              {product.soldCount} sold
            </span>
          )}
        </div>
        <div className="mt-auto pt-3">
          <div className="flex items-center gap-3">
            {line ? (
              <div className="flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-md border border-[#c9dfcc] bg-[#eff7f0] text-[#245139]">
                <button
                  type="button"
                  aria-label={
                    line.quantity <= minimum
                      ? `Remove ${product.name} from bag`
                      : `Decrease ${product.name} quantity`
                  }
                  disabled={adding || cart.isUpdating}
                  onClick={() =>
                    void (line.quantity <= minimum
                      ? cart.removeProduct(line.variantId!)
                      : cart.updateQuantity(line.variantId!, line.quantity - 1))
                  }
                  className="grid size-11 shrink-0 place-items-center rounded-l-md transition hover:bg-[#deeddf] disabled:opacity-50"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span className="text-sm font-semibold" aria-live="polite">
                  {line.quantity} in bag
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${product.name} quantity`}
                  disabled={
                    adding || cart.isUpdating || line.quantity >= maximum
                  }
                  onClick={() =>
                    void cart.updateQuantity(line.variantId!, line.quantity + 1)
                  }
                  className="grid size-11 shrink-0 place-items-center rounded-r-md transition hover:bg-[#deeddf] disabled:opacity-50"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void add()}
                disabled={!available || adding || cart.isUpdating}
                className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-[#d0d5dd] bg-white px-2 text-sm font-semibold text-[#344054] transition hover:border-[#086b43] hover:text-[#086b43] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShoppingCart className="size-4 shrink-0" aria-hidden />
                {!available
                  ? "Out of stock"
                  : adding
                    ? "Adding…"
                    : "Add to cart"}
              </button>
            )}
          </div>
          {choose && line && (
            <Link
              href={`/products/${product.slug}`}
              className="text-primary mt-2 block text-center text-xs font-medium hover:underline"
            >
              View product options
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
