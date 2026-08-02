"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { useCart } from "../../hooks/use-cart"
import type { CartItem } from "../../types/cart"
import RemoveCartItemDialog from "./remove-cart-item-dialog"

export default function CartItems({ items }: { items: CartItem[] }) {
  const cart = useCart()
  const [pendingRemoval, setPendingRemoval] = useState<CartItem | null>(null)

  return (
    <>
      <div className="space-y-4">
        {items.map((item) => {
          const quantity = getValidQuantity(item.quantity)

          const maximum = Math.max(getValidStock(item.product.stock), 1)

          const lineTotal = item.product.price * quantity

          function decreaseQuantity() {
            if (quantity <= 1) return

            cart.updateQuantity(item.productId, quantity - 1)
          }

          function increaseQuantity() {
            if (quantity >= maximum) return

            cart.updateQuantity(item.productId, quantity + 1)
          }

          return (
            <article
              key={item.productId}
              className="rounded-lg border border-[#E9EAEB] bg-white p-4"
            >
              <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)_170px] md:items-start">
                <Link
                  href={`/products/${item.product.slug}`}
                  aria-label={`View ${item.product.name}`}
                  className="relative aspect-square overflow-hidden rounded-md border border-[#F5F5F5] bg-white"
                >
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    sizes="96px"
                    className="object-contain p-2"
                  />
                </Link>

                <div className="min-w-0">
                  <p className="text-sm leading-5 font-semibold text-[#252B37]">
                    SKU-
                    {formatSku(item.product.id)}
                  </p>

                  <Link
                    href={`/products/${item.product.slug}`}
                    className="hover:text-primary mt-1 block text-sm leading-5 text-[#414651] transition-colors"
                  >
                    {item.product.name}
                  </Link>

                  <p className="mt-2 line-clamp-3 text-xs leading-[18px] text-[#535862]">
                    {item.product.description}
                  </p>
                </div>

                <div className="flex flex-col gap-4 md:items-end">
                  <p className="flex items-baseline font-semibold text-[#252B37]">
                    <span className="mr-1 text-xs leading-[18px]">NGN</span>

                    <span className="text-2xl leading-8">
                      {formatPrice(lineTotal)}
                    </span>
                  </p>

                  <QuantitySelector
                    productName={item.product.name}
                    quantity={quantity}
                    maximum={maximum}
                    onDecrease={decreaseQuantity}
                    onIncrease={increaseQuantity}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPendingRemoval(item)}
                className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-[#B42318] transition-colors hover:text-[#912018]"
              >
                <Trash2 aria-hidden className="size-4" strokeWidth={1.8} />
                Remove Item
              </button>
            </article>
          )
        })}
      </div>

      <RemoveCartItemDialog
        open={pendingRemoval !== null}
        productName={pendingRemoval?.product.name ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoval(null)
          }
        }}
        onConfirm={() => {
          if (!pendingRemoval) return

          cart.removeProduct(pendingRemoval.productId)

          setPendingRemoval(null)
        }}
      />
    </>
  )
}

function QuantitySelector({
  productName,
  quantity,
  maximum,
  onDecrease,
  onIncrease,
}: {
  productName: string
  quantity: number
  maximum: number
  onDecrease: () => void
  onIncrease: () => void
}) {
  return (
    <div className="flex h-12 w-[164px] items-center justify-between rounded-[3px] border border-[#E9EAEB] bg-white px-5">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label={`Decrease quantity of ${productName}`}
        className="grid cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus aria-hidden className="size-4" strokeWidth={2} />
      </button>

      <span
        aria-live="polite"
        className="text-center text-base leading-6 font-medium text-[#414651]"
      >
        {String(quantity).padStart(2, "0")}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= maximum}
        aria-label={`Increase quantity of ${productName}`}
        className="grid cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}

function getValidQuantity(value: number | undefined) {
  const quantity = Number(value)

  return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1
}

function getValidStock(value: number | undefined) {
  const stock = Number(value)

  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0
}

function formatSku(id: string) {
  return id.replace(/^prod-/i, "").toUpperCase()
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(value)
}
