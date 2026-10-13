import type { Product } from "@/features/products/types/product"
import type { Cart, CartItem } from "../types/cart"
import { z } from "zod"
import { syncSession } from "@/features/auth/api/session-store"
import { GettyApiError } from "@/lib/api/client"
import { liveCart } from "./live-cart"
import {
  GuestMergeRequestSchema,
  GuestMergeResultSchema,
  mergeBuyerCart,
} from "./merge-cart"

export const DEVICE_CART_KEY = "getty-device-cart-v1"
const changeEvent = "getty-device-cart-change"
const mergeAttemptSchema = z.object({
  account: z.string(),
  request: GuestMergeRequestSchema,
  status: z.enum(["pending", "complete"]),
  results: z.array(GuestMergeResultSchema).default([]),
  remaining: z.string().optional(),
})
type MergeAttempt = z.infer<typeof mergeAttemptSchema>

export function deviceMergeAttempt(
  snapshot = deviceCartSnapshot()
): MergeAttempt | null {
  try {
    const parsed = mergeAttemptSchema.safeParse(JSON.parse(snapshot).merge)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
function saveDeviceState(items: CartItem[], merge: MergeAttempt | null) {
  try {
    // Keep the receipt and accepted-line removal atomic in a single storage write.
    window.localStorage.setItem(
      DEVICE_CART_KEY,
      JSON.stringify({ items, merge })
    )
    window.dispatchEvent(new Event(changeEvent))
    return true
  } catch {
    return false
  }
}

export function deviceCartSnapshot() {
  try {
    return window.localStorage.getItem(DEVICE_CART_KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

export function subscribeDeviceCart(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DEVICE_CART_KEY || event.key === null) onChange()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(changeEvent, onChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(changeEvent, onChange)
  }
}

export function parseDeviceItems(snapshot: string): CartItem[] {
  try {
    const stored: unknown = JSON.parse(snapshot)
    const rows: unknown = Array.isArray(stored)
      ? stored
      : stored && typeof stored === "object" && "items" in stored
        ? stored.items
        : []
    if (!Array.isArray(rows)) return []
    return rows.flatMap((row): CartItem[] => {
      if (!row || typeof row !== "object") return []
      const item = row as Partial<CartItem>
      const product = item.product as Partial<Product> | undefined
      if (
        !product ||
        typeof item.variantId !== "string" ||
        typeof product.id !== "string" ||
        typeof product.slug !== "string" ||
        typeof product.name !== "string" ||
        typeof product.image !== "string" ||
        typeof product.price !== "number" ||
        !Number.isFinite(product.price) ||
        typeof item.quantity !== "number" ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      )
        return []
      return [
        {
          productId: product.id,
          variantId: item.variantId,
          quantity: item.quantity!,
          minimum: Math.max(1, product.minimumOrderQuantity ?? 1),
          product: {
            ...product,
            variantId: item.variantId,
            category: product.category ?? {
              id: "",
              name: "Medical supplies",
              slug: "",
            },
            description: product.description ?? "",
            stock: product.stock ?? 0,
            active: product.active ?? true,
            createdAt: product.createdAt ?? "",
          } as Product,
        },
      ]
    })
  } catch {
    return []
  }
}

export function readDeviceItems() {
  return parseDeviceItems(deviceCartSnapshot())
}

export function saveDeviceItems(items: CartItem[]) {
  return saveDeviceState(items, deviceMergeAttempt())
}

export function assertGuestItemsEditable() {
  if (deviceMergeAttempt()?.status === "pending")
    throw new Error(
      "Your saved bag is still being confirmed. Try syncing it again before changing these items."
    )
}

export function deviceCart(items: CartItem[]): Cart {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  return {
    mode: "device",
    authenticated: false,
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal,
    deliveryFee: 0,
    discount: 0,
    total: subtotal,
  }
}

function guestLines(items: CartItem[]) {
  const quantities = new Map<string, number>()
  for (const item of items) {
    if (item.variantId)
      quantities.set(
        item.variantId,
        (quantities.get(item.variantId) ?? 0) + item.quantity
      )
  }
  return [...quantities].map(([variant, quantity]) => ({ variant, quantity }))
}
const fingerprint = (items: CartItem[]) => JSON.stringify(guestLines(items))
let loading: Promise<Cart> | null = null

/** Read first, then durably merge guest quantities exactly once, including after a reload. */
export function loadBuyerCart(
  options: { retryRejected?: boolean } = {}
): Promise<Cart> {
  if (loading) return loading
  const run = async () => {
    const expected = syncSession()
    const account = expected.user?.id
    if (!account) return liveCart()
    const assertSession = () => {
      const current = syncSession()
      if (
        current.sessionId !== expected.sessionId ||
        current.user?.id !== account
      )
        throw new Error("Your account has changed. Please try again.")
    }
    const execute = async () => {
      assertSession()
      const current = await liveCart()
      assertSession()
      const items = readDeviceItems()
      let attempt = deviceMergeAttempt()
      if (attempt?.status === "pending" && attempt.account !== account)
        throw new Error(
          "Sign in to the customer account that started saving this bag to confirm its items."
        )
      if (!items.length && attempt?.status !== "pending") return current
      if (
        attempt?.status === "complete" &&
        attempt.account === account &&
        attempt.remaining === fingerprint(items) &&
        !options.retryRejected
      )
        return current
      if (attempt?.status !== "pending") {
        const request = GuestMergeRequestSchema.safeParse({
          token: crypto.randomUUID(),
          items: guestLines(items),
        })
        if (!request.success)
          throw new Error(
            "Check your saved items. A bag can contain up to 100 product options with whole-number quantities."
          )
        attempt = {
          account,
          status: "pending",
          request: request.data,
          results: [],
        }
        if (!saveDeviceState(items, attempt))
          throw new Error(
            "Your bag could not be saved safely on this device. Enable browser storage and try again."
          )
      }
      const submitted = attempt
      const response = await mergeBuyerCart(attempt.request).catch((error) => {
        assertSession()
        // Validation / permission failures are definitive; transport failures and
        // incomplete receipts retain the exact request so a retry cannot add twice.
        if (
          error instanceof GettyApiError &&
          [400, 403, 404, 422].includes(error.status)
        ) {
          const remaining = readDeviceItems()
          saveDeviceState(remaining, {
            ...submitted,
            status: "complete",
            remaining: fingerprint(remaining),
            results: submitted.request.items.map((item) => ({
              ...item,
              status: "rejected" as const,
              message: error.message,
            })),
          })
        }
        throw error
      })
      assertSession()
      const accepted = new Map(
        response.results
          .filter((row) => row.status === "merged")
          .map((row) => [row.variant, row.quantity])
      )
      const remaining = readDeviceItems().flatMap((item) => {
        const merged = accepted.get(item.variantId ?? "") ?? 0
        const removed = Math.min(item.quantity, merged)
        accepted.set(item.variantId ?? "", merged - removed)
        return item.quantity > removed
          ? [{ ...item, quantity: item.quantity - removed }]
          : []
      })
      if (
        !saveDeviceState(remaining, {
          ...attempt,
          status: "complete",
          results: response.results,
          remaining: fingerprint(remaining),
        })
      )
        throw new Error(
          "Your bag was updated, but this device could not save the confirmation. Try again to confirm it safely."
        )
      return response.cart
    }
    // Coordinate tabs as well as multiple useCart consumers in this tab.
    if (typeof navigator !== "undefined" && navigator.locks)
      return navigator.locks.request("getty-guest-cart-merge", execute)
    return execute()
  }
  loading = run().finally(() => {
    loading = null
  })
  return loading
}
