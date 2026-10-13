"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { numericField } from "@/lib/form-schemas"
import { FieldError } from "@/components/shared/form/validated-form"

import { Minus, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useId, useState } from "react"

import { useCart } from "../../hooks/use-cart"
import type { CartItem } from "../../types/cart"
import RemoveCartItemDialog from "./remove-cart-item-dialog"
import { formatCurrency } from "@/features/products/utils/format-currency"
import { productMaximum } from "@/features/products/utils/availability"

export default function CartItems({
  items,
  guest = false,
}: {
  items: CartItem[]
  guest?: boolean
}) {
  const cart = useCart()
  const updateQuantity = guest ? cart.updateGuestQuantity : cart.updateQuantity
  const removeProduct = guest ? cart.removeGuestProduct : cart.removeProduct
  const disabled = guest
    ? cart.guestMergePending || cart.isSyncing
    : cart.isUpdating
  const [pendingRemoval, setPendingRemoval] = useState<CartItem | null>(null)

  return (
    <>
      <div className="space-y-4">
        {items.map((item) => {
          const quantity = getValidQuantity(item.quantity)

          const maximum = guest
            ? 2147483647
            : Math.max(productMaximum(item.product), 1)

          const minimum = guest ? 1 : (item.minimum ?? 1)
          const rejection = guest
            ? cart.guestMergeResults.find(
                (result) =>
                  result.variant === item.variantId &&
                  result.status === "rejected"
              )
            : undefined
          const lineTotal = item.lineSubtotal ?? item.product.price * quantity

          function decreaseQuantity() {
            if (quantity <= minimum) return

            updateQuantity(item.variantId ?? item.productId, quantity - 1)
          }

          function increaseQuantity() {
            if (quantity >= maximum) return

            updateQuantity(item.variantId ?? item.productId, quantity + 1)
          }

          return (
            <article
              key={item.variantId ?? item.productId}
              className="rounded-2xl border border-[#E9EAEB] bg-white p-4"
            >
              <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
                <Link
                  href={`/products/${item.product.slug}`}
                  aria-label={`View ${item.product.name}`}
                  className="relative aspect-square overflow-hidden rounded-md border border-[#F5F5F5] bg-white"
                >
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    unoptimized={item.product.source === "remote"}
                    fill
                    sizes="96px"
                    className="object-contain p-2"
                  />
                </Link>

                <div className="min-w-0">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="hover:text-primary block text-sm leading-5 font-semibold [overflow-wrap:anywhere] text-[#2e4431]"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-2 text-xs leading-5 [overflow-wrap:anywhere] text-[#5e6f63]">
                    SKU: {item.product.sku ?? formatSku(item.product.id)}
                  </p>
                </div>

                <div className="col-span-2 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xl font-semibold [overflow-wrap:anywhere] text-[#173d2b]">
                    {item.priceAvailable === false
                      ? "Unavailable"
                      : formatCurrency(lineTotal)}
                  </p>

                  <QuantitySelector
                    productName={item.product.name}
                    quantity={quantity}
                    maximum={maximum}
                    onSetQuantity={(value) => {
                      void updateQuantity(
                        item.variantId ?? item.productId,
                        value
                      )
                    }}
                    minimum={minimum}
                    disabled={disabled}
                    onDecrease={decreaseQuantity}
                    onIncrease={increaseQuantity}
                  />
                </div>
              </div>

              {rejection && (
                <p
                  role="status"
                  className="mt-3 text-sm leading-6 text-amber-900"
                >
                  {rejection.message ??
                    "This item could not be added. Adjust its quantity or remove it."}
                  {rejection.available !== undefined &&
                    ` Available: ${rejection.available}.`}
                  {rejection.existing !== undefined &&
                    ` Already in your account bag: ${rejection.existing}.`}
                </p>
              )}
              {!guest && item.purchasable === false && (
                <p role="status" className="mt-3 text-sm text-red-700">
                  This option is unavailable. Check its quantity, remove it or
                  choose another option on the product page.
                </p>
              )}
              <button
                disabled={disabled}
                type="button"
                onClick={() => setPendingRemoval(item)}
                className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-[#B42318] transition-colors hover:text-[#912018]"
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
        onConfirm={async () => {
          if (!pendingRemoval) return false
          return removeProduct(
            pendingRemoval.variantId ?? pendingRemoval.productId
          )
        }}
      />
    </>
  )
}

function QuantitySelector({
  productName,
  quantity,
  maximum,
  minimum,
  disabled,
  onDecrease,
  onIncrease,
  onSetQuantity,
}: {
  productName: string
  quantity: number
  maximum: number
  minimum: number
  disabled: boolean
  onDecrease: () => void
  onIncrease: () => void
  onSetQuantity: (value: number) => void
}) {
  const schema = z.object({
    quantity: numericField("Quantity", minimum, maximum, true),
  })
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    values: { quantity: String(quantity) },
    shouldUseNativeValidation: false,
  })
  const errorId = `${useId()}-error`
  const quantityField = form.register("quantity")
  function submit(values: z.output<typeof schema>) {
    if (!disabled && values.quantity !== quantity)
      onSetQuantity(values.quantity)
  }
  return (
    <div className="max-w-64">
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="flex h-12 w-[164px] items-center justify-between rounded-xl border border-[#c9dfcc] bg-[#eff7f0] px-1"
      >
        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled || quantity <= minimum}
          aria-label={`Decrease quantity of ${productName}`}
          className="grid size-11 shrink-0 cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Minus aria-hidden className="size-4" strokeWidth={2} />
        </button>

        <input
          {...quantityField}
          aria-label={`Quantity of ${productName}`}
          aria-invalid={Boolean(form.formState.errors.quantity)}
          aria-describedby={
            form.formState.errors.quantity ? errorId : undefined
          }
          className="w-14 appearance-none text-center text-base font-medium outline-none"
          type="number"
          disabled={disabled}
          onBlur={(event) => {
            void quantityField.onBlur(event)
            void form.handleSubmit(submit)()
          }}
        />

        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled || quantity >= maximum}
          aria-label={`Increase quantity of ${productName}`}
          className="grid size-11 shrink-0 cursor-pointer place-items-center text-[#181D27] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Plus aria-hidden className="size-4" strokeWidth={2} />
        </button>
      </form>
      <FieldError
        id={errorId}
        message={form.formState.errors.quantity?.message}
      />
    </div>
  )
}

function getValidQuantity(value: number | undefined) {
  const quantity = Number(value)

  return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1
}

function formatSku(id: string) {
  return id.replace(/^prod-/i, "").toUpperCase()
}
