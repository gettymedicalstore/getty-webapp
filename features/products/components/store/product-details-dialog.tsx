"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  X,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

import { isProductInStock, productMaximum } from "../../utils/availability"
import type { Product } from "../../types/product"
import { Facebook } from "@/components/svgs/socials"
import Link from "next/link"

type ProductDetailsDialogProps = {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart?: (product: Product, quantity: number) => void
  onBuyNow?: (product: Product, quantity: number) => void
  onToggleWishlist?: (product: Product) => void
  isWishlisted?: boolean
}

export default function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  isWishlisted = false,
}: ProductDetailsDialogProps) {
  const productImages = product.images?.length
    ? product.images
    : [product.image]

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const [quantity, setQuantity] = useState(1)

  const selectedImage = productImages[selectedImageIndex] ?? product.image

  const rating = Math.min(5, Math.max(0, product.rating ?? 0))

  const canDecrease = quantity > 1
  const canIncrease = quantity < productMaximum(product)
  const isOutOfStock = !isProductInStock(product)

  function previousImage() {
    setSelectedImageIndex((current) =>
      current === 0 ? productImages.length - 1 : current - 1
    )
  }

  function nextImage() {
    setSelectedImageIndex((current) =>
      current === productImages.length - 1 ? 0 : current + 1
    )
  }

  function decreaseQuantity() {
    if (!canDecrease) return

    setQuantity((current) => current - 1)
  }

  function increaseQuantity() {
    if (!canIncrease) return

    setQuantity((current) => current + 1)
  }

  function handleAddToCart() {
    if (isOutOfStock) return

    if (product.source === "remote") {
      window.location.assign(`/products/${product.slug}`)
      return
    }
    onAddToCart?.(product, quantity)
  }

  function handleBuyNow() {
    if (isOutOfStock) return

    if (product.source === "remote") {
      window.location.assign(`/products/${product.slug}`)
      return
    }
    onBuyNow?.(product, quantity)
  }

  async function copyProductLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/products/${product.slug}`
      )

      toast.success("Product link copied")
    } catch {
      toast.error("Unable to copy product link")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] w-[calc(100%-2rem)] max-w-7xl overflow-y-auto rounded-lg border-0 bg-white p-0 shadow-2xl sm:w-[calc(100%-3rem)]"
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        <DialogDescription className="sr-only">
          Product details, images, price, stock and purchasing controls.
        </DialogDescription>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close product details"
          className="fixed top-6 right-6 z-50 grid size-11 cursor-pointer place-items-center rounded-full bg-white/30 text-white backdrop-blur-sm transition hover:bg-white/45 lg:absolute lg:-top-1 lg:-right-16"
        >
          <span className="text-3xl leading-none font-light">
            <X />
          </span>
        </button>

        <div className="grid lg:grid-cols-[1.04fr_0.96fr]">
          <ProductGallery
            productName={product.name}
            images={productImages}
            selectedImage={selectedImage}
            selectedImageIndex={selectedImageIndex}
            onSelectImage={setSelectedImageIndex}
            onPrevious={previousImage}
            onNext={nextImage}
          />

          <div className="flex flex-col px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
            <div className="border-b border-[#E9EAEB] pb-5">
              <h2 className="text-xl leading-7 font-medium text-[#252B37] sm:text-2xl">
                {product.name}
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#5e6f63]">
                {product.description}
              </p>

              <div className="mt-5 grid gap-4 text-sm text-[#535862] sm:grid-cols-2">
                <div className="space-y-4">
                  <p>
                    <span>SKU: </span>

                    <strong className="font-semibold text-[#252B37]">
                      {product.id.toUpperCase()}
                    </strong>
                  </p>

                  <p>
                    <span>Category: </span>

                    <strong className="font-semibold text-[#252B37]">
                      {product.category.name}
                    </strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <p>
                    <span>Availability: </span>

                    <strong className="font-semibold text-[#252B37]">
                      {product.stockKnown === false
                        ? isOutOfStock
                          ? "Out of stock"
                          : "In stock"
                        : `${product.stock.toLocaleString("en-NG")} in stock`}
                    </strong>

                    {product.soldCount !== undefined && (
                      <>
                        <span className="mx-2">|</span>

                        <strong className="font-semibold text-[#252B37]">
                          {product.soldCount.toLocaleString("en-NG")} sold
                        </strong>
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span>Share product:</span>

                    <button
                      type="button"
                      onClick={copyProductLink}
                      aria-label="Copy product link"
                      className="hover:text-primary text-[#5e6f63] transition"
                    >
                      <Copy className="size-4" />
                    </button>

                    <Link
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                        `/products/${product.slug}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Share on Facebook"
                      className="hover:text-primary text-[#5e6f63] transition"
                    >
                      <Facebook className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-5 py-6">
              <p className="text-primary flex items-baseline">
                <span className="mr-1 text-xs font-semibold">NGN</span>

                <span className="text-3xl leading-none font-semibold">
                  {formatPrice(product.price)}
                </span>
              </p>

              <ProductRating rating={rating} />
            </div>

            <div className="grid gap-3 sm:grid-cols-[136px_minmax(0,1fr)_112px]">
              <QuantitySelector
                quantity={quantity}
                canDecrease={canDecrease}
                canIncrease={canIncrease}
                onDecrease={decreaseQuantity}
                onIncrease={increaseQuantity}
              />

              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="bg-primary hover:bg-primary-darker h-12 rounded-md text-sm font-semibold text-white"
              >
                <ShoppingCart className="size-5" />

                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>

              <Button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="h-12 rounded-md bg-[#D1FADF] text-sm font-semibold text-[#027A48] hover:bg-[#A6F4C5]"
              >
                Buy now
              </Button>
            </div>

            <button
              type="button"
              onClick={() => onToggleWishlist?.(product)}
              aria-pressed={isWishlisted}
              className="hover:text-primary mt-5 flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-[#414651] transition"
            >
              <Heart
                className={`size-5 ${
                  isWishlisted ? "fill-primary text-primary" : ""
                }`}
              />

              {isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            </button>

            <div className="mt-6 rounded-md border border-[#E9EAEB] p-5">
              <p className="text-sm font-medium text-[#414651]">
                100% Guarantee Safe Checkout
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {["VISA", "MC", "PayPal", "VERVE", "AMEX"].map((method) => (
                  <span
                    key={method}
                    className="grid h-6 min-w-10 place-items-center rounded-sm border border-[#E9EAEB] bg-[#FAFAFA] px-1.5 text-[9px] font-bold text-[#535862]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-[#535862]">
              <Check className="text-primary size-4" />
              Secure payment and protected checkout
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ProductGalleryProps = {
  productName: string
  images: string[]
  selectedImage: string
  selectedImageIndex: number
  onSelectImage: (index: number) => void
  onPrevious: () => void
  onNext: () => void
}

function ProductGallery({
  productName,
  images,
  selectedImage,
  selectedImageIndex,
  onSelectImage,
  onPrevious,
  onNext,
}: ProductGalleryProps) {
  return (
    <div className="border-b border-[#E9EAEB] p-5 sm:p-8 lg:border-r lg:border-b-0">
      <div className="relative aspect-[1.3/1] overflow-hidden rounded-md border border-[#E9EAEB] bg-white">
        <Image
          unoptimized
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-contain p-5 sm:p-8"
        />
      </div>

      <div className="relative mt-5">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Previous product image"
          className="bg-primary hover:bg-primary-darker absolute top-1/2 -left-5 z-10 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-white shadow-lg transition sm:-left-6"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="grid [scrollbar-width:none] auto-cols-[82px] grid-flow-col gap-2 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden">
          {images.map((image, index) => {
            const isActive = selectedImageIndex === index

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => onSelectImage(index)}
                aria-label={`View product image ${index + 1}`}
                className={`relative aspect-square overflow-hidden rounded-sm border bg-white transition ${
                  isActive
                    ? "border-primary border-2"
                    : "hover:border-primary/50 border-[#E9EAEB]"
                }`}
              >
                <Image
                  unoptimized
                  src={image}
                  alt={`${productName} image ${index + 1}`}
                  fill
                  sizes="82px"
                  className="object-contain p-2"
                />
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next product image"
          className="bg-primary hover:bg-primary-darker absolute top-1/2 -right-5 z-10 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-white shadow-lg transition sm:-right-6"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  )
}

type QuantitySelectorProps = {
  quantity: number
  canDecrease: boolean
  canIncrease: boolean
  onDecrease: () => void
  onIncrease: () => void
}

function QuantitySelector({
  quantity,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: QuantitySelectorProps) {
  return (
    <div className="flex h-12 items-center rounded-md border border-[#D5D7DA] bg-white">
      <button
        type="button"
        onClick={onDecrease}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
        className="grid h-full flex-1 cursor-pointer place-items-center text-[#414651] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus className="size-4" />
      </button>

      <span className="w-10 text-center text-sm font-medium text-[#252B37]">
        {String(quantity).padStart(2, "0")}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        aria-label="Increase quantity"
        className="grid h-full flex-1 cursor-pointer place-items-center text-[#414651] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

function ProductRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < Math.round(rating)

        return (
          <Star
            key={index}
            aria-hidden
            className={`size-4 ${
              filled
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
