"use client"
import { ProductDetailSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"

import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Minus,
  Plus,
  ShoppingCart,
  Star,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Facebook, Pinterest, Twitter } from "@/components/svgs/socials"
import { Button } from "@/components/ui/button"
import { useCart } from "@/features/cart/hooks/use-cart"
import { safeYouTubeEmbedUrl } from "@/lib/youtube"

import {
  isProductInStock,
  productMaximum,
  productMinimum,
} from "../../utils/availability"
import ProductPrice from "./product-price"
import ProductReviews from "./product-reviews"
import RelatedProducts from "./related-products"
import { productQueryOptions } from "../../api/get-product"
import {
  preferredProductVariant,
  selectProductVariant,
} from "../../utils/product-pricing"

export default function ProductDetails({ slug }: { slug: string }) {
  const productQuery = useQuery(productQueryOptions(slug))

  const router = useRouter()
  const cart = useCart()

  const [quantity, setQuantity] = useState(1)
  const [variantId, setVariantId] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  if (productQuery.isPending) {
    return <ProductDetailSkeleton />
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <section className="site-container py-12">
        <h1 className="sr-only">Product details</h1>
        <ContentError
          title="This product is temporarily unavailable"
          onRetry={() => void productQuery.refetch()}
        />
      </section>
    )
  }

  const baseProduct = productQuery.data
  const variant = preferredProductVariant(baseProduct.variants, variantId)
  const product = variant
    ? selectProductVariant(baseProduct, variant)
    : baseProduct
  const minimum = productMinimum(product)
  const orderQuantity = Math.max(minimum, quantity)
  const images = product.images?.length ? product.images : [product.image]
  // const images = product.images?.length > 0 ? product.images : [product.image]

  const selectedImage = images[selectedImageIndex] ?? product.image
  const available =
    isProductInStock(product) &&
    (product.source !== "remote" || Boolean(variant))
  const cartLine = cart.cart.items.find((item) =>
    product.variantId
      ? item.variantId === product.variantId
      : item.productId === product.id
  )
  const rating = Math.min(5, Math.max(0, product.rating ?? 0))
  const detail = product.detail
  const youtubeEmbed = safeYouTubeEmbedUrl(detail?.youtubeEmbed)
  const originName = detail?.originName?.trim()
  const originCode = detail?.origin?.trim()
  const productFacts = detail
    ? [
        { label: "Manufacturer", value: detail.manufacturer },
        { label: "Model", value: detail.model },
        {
          label: "Country of origin",
          value: originName
            ? `${originName}${originCode ? ` (${originCode})` : ""}`
            : originCode,
        },
      ].filter((item) => item.value?.trim())
    : []
  const careFacts = detail
    ? [
        {
          label: "Sterile",
          value: detail.sterile == null ? null : detail.sterile ? "Yes" : "No",
        },
        {
          label: "Disposable",
          value:
            detail.disposable == null ? null : detail.disposable ? "Yes" : "No",
        },
        {
          label: "Requires cold storage",
          value:
            detail.coldchain == null ? null : detail.coldchain ? "Yes" : "No",
        },
        {
          label: "Shelf life",
          value: detail.shelflife == null ? null : `${detail.shelflife} days`,
        },
        {
          label: "Warranty",
          value: detail.warranty == null ? null : `${detail.warranty} months`,
        },
        {
          label: "Dispatch time",
          value: detail.dispatch == null ? null : `${detail.dispatch} days`,
        },
      ].filter((item) => item.value?.trim())
    : []
  const usageDetails = detail
    ? [
        { label: "Intended use", value: detail.usage },
        { label: "Instructions", value: detail.instructions },
        { label: "Warnings", value: detail.warnings },
      ].filter((item) => item.value?.trim())
    : []
  const specifications =
    product.specifications?.filter(
      (item) => item.name.trim() && item.value.trim()
    ) ?? []
  const hasDetails =
    specifications.length > 0 ||
    productFacts.length > 0 ||
    careFacts.length > 0 ||
    usageDetails.length > 0

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
    setQuantity((current) => Math.max(minimum, current - 1))
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(productMaximum(product), Math.max(minimum, current) + 1)
    )
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

    void cart.addProduct(product, orderQuantity)
  }

  function handleBuyNow() {
    if (cartLine) {
      router.push("/checkout")
      return
    }
    if (!available) {
      return
    }

    void cart.addProduct(product, orderQuantity).then((added) => {
      if (added)
        router.push(product.source === "remote" ? "/cart" : "/checkout")
    })
  }

  return (
    <section className="bg-[#f7f9f5] py-10 sm:py-14 lg:py-16">
      <div className="site-container">
        <div className="min-h-[664px] overflow-hidden rounded-2xl border border-[#e3eae3] bg-white p-5 sm:p-8 xl:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
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
                <h1 className="text-2xl leading-tight font-semibold tracking-tight text-[#183c2c] sm:text-3xl">
                  {product.name}
                </h1>

                <p className="font-geist text-sm leading-5 font-normal text-[#5e6f63]">
                  {product.description}
                </p>
              </div>

              <div className="grid gap-4 text-sm leading-5 text-[#535862] sm:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <p>
                    <span className="font-normal">Category: </span>

                    <span className="font-semibold [overflow-wrap:anywhere] text-[#252B37]">
                      {product.category.name}
                    </span>
                  </p>
                </div>

                <div>
                  <p>
                    <span className="font-normal">Availability: </span>

                    <span className="font-semibold [overflow-wrap:anywhere] text-[#252B37]">
                      {product.stockKnown === false
                        ? available
                          ? "In stock"
                          : "Out of stock"
                        : `${product.stock.toLocaleString("en-NG")} in stock`}
                    </span>

                    {product.soldCount !== undefined && (
                      <>
                        <span className="mx-2">|</span>

                        <span className="font-semibold [overflow-wrap:anywhere] text-[#252B37]">
                          {product.soldCount.toLocaleString("en-NG")} sold
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#F5F5F5]" />

              <div className="flex flex-wrap items-center justify-between gap-5">
                <ProductPrice
                  price={product.price}
                  compareAtPrice={product.compareAtPrice}
                  currency={product.currency}
                  large
                />

                {(product.reviewCount ?? 0) > 0 && (
                  <ProductRating rating={rating} />
                )}
              </div>

              {baseProduct.variants && baseProduct.variants.length > 1 && (
                <label className="mb-3 text-sm font-medium">
                  Product option
                  <select
                    className="form-input mt-2"
                    value={variant?.id ?? ""}
                    onChange={(event) => {
                      setVariantId(event.target.value)
                      setQuantity(
                        baseProduct.variants?.find(
                          (v) => v.id === event.target.value
                        )?.minimumOrderQuantity ?? 1
                      )
                    }}
                  >
                    {baseProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.saleUnit}, {v.unitsPerPack} per pack
                        {v.inStock ? "" : " (out of stock)"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap gap-3">
                {cartLine ? (
                  <span className="inline-flex h-12 min-w-32 items-center justify-center rounded-lg border border-[#c9dfcc] bg-[#eff7f0] px-4 text-sm font-semibold text-[#245139]">
                    {cartLine.quantity} in bag
                  </span>
                ) : (
                  <>
                    <QuantitySelector
                      quantity={orderQuantity}
                      available={available}
                      maximum={productMaximum(product)}
                      minimum={minimum}
                      onDecrease={decreaseQuantity}
                      onIncrease={increaseQuantity}
                    />

                    <Button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!available || cart.isUpdating}
                      className="border-primary bg-primary h-12 min-w-40 flex-1 rounded-lg border px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,13,18,0.05)] hover:bg-[#027A48]"
                    >
                      <ShoppingCart aria-hidden className="size-5" />

                      {available ? "Add to Cart" : "Out of Stock"}
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={(!available && !cartLine) || cart.isUpdating}
                  className="h-12 min-w-32 flex-1 rounded-lg border border-[#D7FFEE] bg-[#D7FFEE] px-5 text-sm font-semibold text-[#027A48] shadow-[0_1px_2px_rgba(10,13,18,0.05)] hover:bg-[#C4F9E1]"
                >
                  {cartLine ? "Checkout" : "Buy now"}
                </Button>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-4 text-sm text-[#5e6f63]">
                <span className="mr-1">Share product:</span>

                <button
                  type="button"
                  onClick={copyProductLink}
                  aria-label="Copy product link"
                  className="hover:text-primary grid size-11 cursor-pointer place-items-center rounded-lg text-[#5e6f63] transition-colors"
                >
                  <Copy aria-hidden className="size-4" />
                </button>

                <SocialButton
                  label="Share on Facebook"
                  onClick={shareOnFacebook}
                >
                  <Facebook className="size-4" />
                </SocialButton>

                <SocialButton label="Share on Twitter" onClick={shareOnTwitter}>
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
        </div>
        {youtubeEmbed && (
          <section
            aria-label="Product video"
            className="mt-6 rounded-2xl border border-[#e3eae3] bg-white px-5 py-6 sm:px-8 sm:py-8"
          >
            <h2 className="text-xl font-semibold text-[#252B37] sm:text-2xl">
              Product video
            </h2>
            <div className="mt-5 aspect-video w-full overflow-hidden rounded-xl bg-[#f1f5f1]">
              <iframe
                src={youtubeEmbed}
                title={`${product.name} video`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          </section>
        )}
        {hasDetails && (
          <section className="mt-6 rounded-2xl border border-[#e3eae3] bg-white px-5 py-6 sm:px-8 sm:py-8">
            <h2 className="text-xl font-semibold text-[#252B37] sm:text-2xl">
              Product details
            </h2>
            <div className="mt-6 grid gap-x-12 gap-y-9 border-t border-[#e3eae3] pt-6 lg:grid-cols-2">
              {specifications.length > 0 && (
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#183c2c]">
                    Specifications
                  </h3>
                  <dl className="mt-3 divide-y divide-[#edf0ed]">
                    {specifications.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4"
                      >
                        <dt className="text-sm text-[#667568]">{item.name}</dt>
                        <dd className="text-sm font-medium break-words text-[#252B37]">
                          {item.value}
                          {item.unit ? ` ${item.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {productFacts.length > 0 && (
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#183c2c]">
                    Product information
                  </h3>
                  <dl className="mt-3 divide-y divide-[#edf0ed]">
                    {productFacts.map((item) => (
                      <div
                        key={item.label}
                        className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4"
                      >
                        <dt className="text-sm text-[#667568]">{item.label}</dt>
                        <dd className="text-sm font-medium break-words text-[#252B37]">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {usageDetails.length > 0 && (
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#183c2c]">
                    Usage and safety
                  </h3>
                  <dl className="mt-3 space-y-4">
                    {usageDetails.map((item) => (
                      <div key={item.label} className="min-w-0">
                        <dt className="text-sm font-medium text-[#344e3d]">
                          {item.label}
                        </dt>
                        <dd className="mt-1 max-w-prose text-sm leading-6 break-words whitespace-pre-wrap text-[#535f56]">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {careFacts.length > 0 && (
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#183c2c]">
                    Care and delivery
                  </h3>
                  <dl className="mt-3 grid gap-x-6 gap-y-0 sm:grid-cols-2">
                    {careFacts.map((item) => (
                      <div
                        key={item.label}
                        className="min-w-0 border-t border-[#edf0ed] py-3"
                      >
                        <dt className="text-sm text-[#667568]">{item.label}</dt>
                        <dd className="mt-1 text-sm font-medium break-words text-[#252B37]">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </section>
        )}
        {product.source === "remote" && (
          <>
            <RelatedProducts productId={product.id} />
            <ProductReviews product={product.id} />
          </>
        )}
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
    <div className="flex min-w-0 flex-col gap-4">
      <div className="relative aspect-square max-h-[464px] overflow-hidden rounded-xl border border-[#F5F5F5] bg-white">
        <Image
          unoptimized
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 616px"
          className="object-contain p-5 sm:p-8"
        />
      </div>

      {hasMultipleImages && (
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
                    unoptimized
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
      )}
    </div>
  )
}

type QuantitySelectorProps = {
  quantity: number
  available: boolean
  minimum: number
  maximum: number
  onDecrease: () => void
  onIncrease: () => void
}

function QuantitySelector({
  quantity,
  available,
  minimum,
  maximum,
  onDecrease,
  onIncrease,
}: QuantitySelectorProps) {
  return (
    <div className="flex h-12 w-40 shrink-0 items-center justify-between rounded-xl border border-[#c9dfcc] bg-[#eff7f0] px-1">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= minimum}
        aria-label="Decrease quantity"
        className="grid size-11 cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus aria-hidden className="size-4" strokeWidth={2} />
      </button>

      <span className="font-geist text-center text-base leading-6 font-medium text-[#414651]">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={!available || quantity >= maximum}
        aria-label="Increase quantity"
        className="grid size-11 cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}

function ProductRating({ rating }: { rating: number }) {
  return (
    <div
      role="img"
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
      className="hover:text-primary grid size-11 cursor-pointer place-items-center rounded-lg text-[#5e6f63] transition-colors"
    >
      {children}
    </button>
  )
}
