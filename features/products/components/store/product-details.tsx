"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
} from "lucide-react"
import Image from "next/image"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Facebook, Pinterest, Twitter } from "@/components/svgs/socials"
import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/hooks/use-cart"
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist"

import { productQueryOptions } from "../../api/get-product"

const paymentMethods = [
  {
    name: "Visa",
    image: "/images/payments/visa.svg",
  },
  {
    name: "Mastercard",
    image: "/images/payments/mastercard.svg",
  },
  {
    name: "Verve",
    image: "/images/payments/verve.svg",
  },
  {
    name: "PayPal",
    image: "/images/payments/paypal.svg",
  },
]

export default function ProductDetails({ slug }: { slug: string }) {
  const productQuery = useQuery(productQueryOptions(slug))

  const cart = useCart()
  const wishlist = useWishlist()

  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  if (productQuery.isPending) {
    return <ProductDetailsSkeleton />
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <section className="bg-[#F5F5F5] py-20">
        <div className="mx-auto w-full max-w-330 px-4 text-center lg:px-6 xl:px-0">
          <h1 className="text-2xl font-semibold text-[#252B37]">
            Product could not be loaded
          </h1>

          <button
            type="button"
            onClick={() => productQuery.refetch()}
            className="bg-primary hover:bg-primary-darker mt-5 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            Try again
          </button>
        </div>
      </section>
    )
  }

  const product = productQuery.data
  const images = product.images?.length ? product.images : [product.image]
  // const images = product.images?.length > 0 ? product.images : [product.image]

  const selectedImage = images[selectedImageIndex] ?? product.image
  const available = product.stock > 0
  const isWishlisted = wishlist.hasProduct(product.id)
  const rating = Math.min(5, Math.max(0, product.rating ?? 0))

  function previousImage() {
    setSelectedImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    )
  }

  function nextImage() {
    setSelectedImageIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    )
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1))
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(product.stock, current + 1))
  }

  async function copyProductLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)

      toast.success("Product link copied")
    } catch {
      toast.error("Unable to copy product link")
    }
  }

  function openShareWindow(url: string) {
    window.open(url, "_blank", "noopener,noreferrer,width=720,height=560")
  }

  function shareOnFacebook() {
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        window.location.href
      )}`
    )
  }

  function shareOnTwitter() {
    openShareWindow(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        window.location.href
      )}&text=${encodeURIComponent(product.name)}`
    )
  }

  function shareOnPinterest() {
    const absoluteImageUrl = new URL(
      product.image,
      window.location.origin
    ).toString()

    openShareWindow(
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
        window.location.href
      )}&media=${encodeURIComponent(
        absoluteImageUrl
      )}&description=${encodeURIComponent(product.name)}`
    )
  }

  function handleAddToCart() {
    if (!available) {
      return
    }

    cart.addProduct(product, quantity)
  }

  function handleBuyNow() {
    if (!available) {
      return
    }

    cart.addProduct(product, quantity)
    window.location.assign("/checkout")
  }

  return (
    <section className="bg-[#F5F5F5] py-10 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-0">
        <div className="min-h-[664px] overflow-hidden rounded-sm border border-[#F5F5F5] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:p-8 xl:p-10">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,616px)_minmax(0,648px)] xl:gap-14">
            <ProductGallery
              productName={product.name}
              images={images}
              selectedImage={selectedImage}
              selectedImageIndex={selectedImageIndex}
              onSelectImage={setSelectedImageIndex}
              onPrevious={previousImage}
              onNext={nextImage}
            />

            <div className="flex min-w-0 flex-col gap-6 xl:max-w-[648px]">
              <div className="flex flex-col gap-2">
                <h1 className="font-public-sans text-xl leading-7 font-normal text-[#252B37]">
                  {product.name}
                </h1>

                <p className="font-geist text-sm leading-5 font-normal text-[#717680]">
                  {product.description}
                </p>
              </div>

              <div className="grid gap-4 text-sm leading-5 text-[#535862] sm:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <p>
                    <span className="font-normal">SKU: </span>

                    <span className="font-semibold text-[#252B37]">
                      {product.id.toUpperCase()}
                    </span>
                  </p>

                  <p>
                    <span className="font-normal">Category: </span>

                    <span className="font-semibold text-[#252B37]">
                      {product.category.name}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <p>
                    <span className="font-normal">Availability: </span>

                    <span className="font-semibold text-[#252B37]">
                      {product.stock.toLocaleString("en-NG")} in stock
                    </span>

                    <span className="mx-2">|</span>

                    <span className="font-semibold text-[#252B37]">
                      {(product.soldCount ?? 0).toLocaleString("en-NG")} sold
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span>Share product:</span>

                    <button
                      type="button"
                      onClick={copyProductLink}
                      aria-label="Copy product link"
                      className="hover:text-primary cursor-pointer text-[#717680] transition-colors"
                    >
                      <Copy aria-hidden className="size-4" />
                    </button>

                    <SocialButton
                      label="Share on Facebook"
                      onClick={shareOnFacebook}
                    >
                      <Facebook className="size-4" />
                    </SocialButton>

                    <SocialButton
                      label="Share on Twitter"
                      onClick={shareOnTwitter}
                    >
                      <Twitter className="size-4" />
                    </SocialButton>

                    <SocialButton
                      label="Share on Pinterest"
                      onClick={shareOnPinterest}
                    >
                      <Pinterest className="size-4" />
                    </SocialButton>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F5F5F5]" />

              <div className="flex items-center justify-between gap-5">
                <p className="font-geist flex items-baseline font-semibold text-[#0A7145]">
                  <span className="mr-1 text-sm leading-5">NGN</span>

                  <span className="text-xl leading-[30px]">
                    {formatPrice(product.price)}
                  </span>
                </p>

                <ProductRating rating={rating} />
              </div>

              <div className="grid gap-4 sm:grid-cols-[164px_minmax(0,326px)_126px]">
                <QuantitySelector
                  quantity={quantity}
                  available={available}
                  maximum={product.stock}
                  onDecrease={decreaseQuantity}
                  onIncrease={increaseQuantity}
                />

                <Button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!available}
                  className="h-12 rounded-lg border border-[#058A51] bg-[#058A51] px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,13,18,0.05)] hover:bg-[#027A48]"
                >
                  <ShoppingCart aria-hidden className="size-5" />

                  {available ? "Add to Cart" : "Out of Stock"}
                </Button>

                <Button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!available}
                  className="h-12 rounded-lg border border-[#D7FFEE] bg-[#D7FFEE] px-5 text-sm font-semibold text-[#027A48] shadow-[0_1px_2px_rgba(10,13,18,0.05)] hover:bg-[#C4F9E1]"
                >
                  Buy now
                </Button>
              </div>

              <button
                type="button"
                onClick={() => wishlist.toggleProduct(product)}
                aria-pressed={isWishlisted}
                className="hover:text-primary flex h-6 w-fit cursor-pointer items-center gap-2 rounded-lg text-base leading-6 font-semibold text-[#535862] transition-colors"
              >
                <Heart
                  aria-hidden
                  className={`size-5 ${
                    isWishlisted ? "fill-primary text-primary" : ""
                  }`}
                  strokeWidth={1.67}
                />

                {isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>

              <div className="flex min-h-22.5 flex-col gap-3 rounded-[3px] border border-[#F5F5F5] bg-white p-5">
                <p className="font-geist text-sm leading-5 font-normal text-[#191C1F]">
                  100% Guarantee Safe Checkout
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.name}
                      className="relative size-11 overflow-hidden bg-white"
                    >
                      <Image
                        src={method.image}
                        alt={method.name}
                        fill
                        sizes="44px"
                        className="object-contain p-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
  const hasMultipleImages = images.length > 1

  return (
    <div className="flex min-w-0 flex-col gap-6 xl:w-[616px]">
      <div className="relative h-[360px] overflow-hidden rounded-sm border border-[#F5F5F5] bg-white sm:h-[464px]">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 616px"
          className="object-contain p-5 sm:p-8"
        />
      </div>

      <div className="relative h-24">
        {hasMultipleImages ? (
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous product image"
            className="absolute top-1/2 -left-5 z-10 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 border-white bg-[#027A48] p-3 text-white shadow-lg transition hover:bg-[#05603A]"
          >
            <ArrowLeft aria-hidden className="size-6" />
          </button>
        ) : null}

        <div className="grid h-24 [scrollbar-width:none] auto-cols-24 grid-flow-col gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {images.map((image, index) => {
            const active = selectedImageIndex === index

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => onSelectImage(index)}
                aria-label={`View product image ${index + 1}`}
                aria-pressed={active}
                className={`relative size-24 overflow-hidden rounded-xs bg-white transition ${
                  active
                    ? "border-2 border-[#027A48]"
                    : "border border-[#F5F5F5]"
                }`}
              >
                <Image
                  src={image}
                  alt={`${productName} image ${index + 1}`}
                  fill
                  sizes="96px"
                  className="object-contain p-2"
                />
              </button>
            )
          })}
        </div>

        {hasMultipleImages ? (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next product image"
            className="absolute top-1/2 -right-5 z-10 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 border-white bg-[#027A48] p-3 text-white shadow-lg transition hover:bg-[#05603A]"
          >
            <ArrowRight aria-hidden className="size-6" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

type QuantitySelectorProps = {
  quantity: number
  available: boolean
  maximum: number
  onDecrease: () => void
  onIncrease: () => void
}

function QuantitySelector({
  quantity,
  available,
  maximum,
  onDecrease,
  onIncrease,
}: QuantitySelectorProps) {
  return (
    <div className="flex h-12 items-center justify-between rounded-[3px] border-2 border-[#F5F5F5] bg-white px-5">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
        className="grid cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus aria-hidden className="size-4" strokeWidth={2} />
      </button>

      <span className="font-geist text-center text-base leading-6 font-medium text-[#414651]">
        {String(quantity).padStart(2, "0")}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={!available || quantity >= maximum}
        aria-label="Increase quantity"
        className="grid cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}

function ProductRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex h-3 items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < Math.round(rating)

        return (
          <Star
            key={index}
            aria-hidden
            className={`size-[11px] ${
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

function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="hover:text-primary cursor-pointer text-[#717680] transition-colors"
    >
      {children}
    </button>
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(price)
}

function ProductDetailsSkeleton() {
  return (
    <section className="bg-[#F5F5F5] py-10 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6 xl:px-0">
        <div className="grid min-h-[664px] gap-14 rounded-sm border border-[#F5F5F5] bg-white p-10 shadow-[0_8px_40px_rgba(0,0,0,0.12)] xl:grid-cols-[616px_648px]">
          <div>
            <div className="h-[464px] animate-pulse rounded-sm bg-[#F2F4F7]" />

            <div className="mt-6 flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="size-24 animate-pulse rounded-sm bg-[#F2F4F7]"
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="h-7 w-3/4 animate-pulse rounded bg-[#F2F4F7]" />
            <div className="h-16 animate-pulse rounded bg-[#F2F4F7]" />
            <div className="h-14 animate-pulse rounded bg-[#F2F4F7]" />
            <div className="h-12 w-1/3 animate-pulse rounded bg-[#F2F4F7]" />
            <div className="h-12 animate-pulse rounded bg-[#F2F4F7]" />
            <div className="h-24 animate-pulse rounded bg-[#F2F4F7]" />
          </div>
        </div>
      </div>
    </section>
  )
}
