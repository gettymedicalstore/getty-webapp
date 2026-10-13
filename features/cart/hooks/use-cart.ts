"use client"
import { useMemo, useSyncExternalStore } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Product } from "@/features/products/types/product"
import {
  isProductInStock,
  productMinimum,
} from "@/features/products/utils/availability"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { syncSession } from "@/features/auth/api/session-store"
import { liveCart, canUseBuyerCart } from "../api/live-cart"
import {
  deviceCart,
  deviceMergeAttempt,
  assertGuestItemsEditable,
  deviceCartSnapshot,
  loadBuyerCart,
  parseDeviceItems,
  readDeviceItems,
  saveDeviceItems,
  subscribeDeviceCart,
} from "../api/device-cart"
import type { Cart, CartItem } from "../types/cart"
let mutations: Promise<unknown> = Promise.resolve(),
  pending = 0
const listeners = new Set<() => void>()
const subscribe = (callback: () => void) => {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
const snapshot = () => pending,
  serverSnapshot = () => 0
function mark(delta: number) {
  pending += delta
  listeners.forEach((fn) => fn())
}
export function useCart() {
  const client = useQueryClient(),
    session = useAuthSession(),
    busy = useSyncExternalStore(subscribe, snapshot, serverSnapshot),
    deviceSnapshot = useSyncExternalStore(
      subscribeDeviceCart,
      deviceCartSnapshot,
      () => "[]"
    ),
    deviceItems = useMemo(
      () => parseDeviceItems(deviceSnapshot),
      [deviceSnapshot]
    )
  const user = session.data?.user,
    eligible = canUseBuyerCart(user),
    key = ["cart", user?.id ?? "guest"]
  const query = useQuery({
    queryKey: key,
    enabled: eligible,
    queryFn: () => loadBuyerCart(),
    staleTime: 0,
    retry: false,
  })
  const attempt = useMemo(
    () => deviceMergeAttempt(deviceSnapshot),
    [deviceSnapshot]
  )
  const guestSyncPending = Boolean(eligible && attempt?.status === "pending")
  const hasGuestItems = eligible && deviceItems.length > 0
  function mutate(operation: (cart: Cart) => Promise<Cart>, message?: string) {
    const sessionId = syncSession().sessionId
    const userId = user?.id
    mark(1)
    const next = mutations
      .then(async () => {
        if (
          syncSession().user?.id !== userId ||
          syncSession().sessionId !== sessionId
        )
          throw new Error("Your account has changed. Please try again.")
        await client.cancelQueries({ queryKey: key })
        const current = await loadBuyerCart()
        if (
          readDeviceItems().length ||
          deviceMergeAttempt()?.status === "pending"
        )
          throw new Error(
            "Finish saving or remove the remaining guest items in your bag before making other changes."
          )
        if (
          syncSession().sessionId !== sessionId ||
          syncSession().user?.id !== userId
        )
          throw new Error("Your account has changed. Please try again.")
        const result = await operation(current)
        if (
          syncSession().sessionId !== sessionId ||
          syncSession().user?.id !== userId
        )
          throw new Error("Your account has changed. Please try again.")
        client.setQueryData(key, result)
        if (message) toast.success(message)
        return true
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Unable to update your bag."
        )
        void client.invalidateQueries({ queryKey: key })
        return false
      })
      .finally(() => mark(-1))
    mutations = next
    return next
  }
  function mutateDevice(
    operation: (items: CartItem[]) => CartItem[],
    message?: string
  ) {
    try {
      assertGuestItemsEditable()
      if (!saveDeviceItems(operation(readDeviceItems())))
        throw new Error("Your bag could not be saved on this device.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update your bag."
      )
      return Promise.resolve(false)
    }
    if (message) toast.success(message)
    if (eligible) void query.refetch()
    return Promise.resolve(true)
  }
  const useDeviceCart = !eligible
  const selectedCart = useDeviceCart
    ? deviceCart(deviceItems)
    : (query.data ?? deviceCart([]))
  return {
    cart: selectedCart,
    requiresBuyerAccount: false,
    isPending: session.isPending || Boolean(eligible && query.isPending),
    isUpdating:
      busy > 0 ||
      Boolean(
        eligible &&
        (query.isPending ||
          query.isFetching ||
          hasGuestItems ||
          guestSyncPending)
      ),
    isError: Boolean(
      eligible && query.isError && !hasGuestItems && !query.data
    ),
    syncError: Boolean(
      eligible && (query.isError || hasGuestItems || guestSyncPending)
    ),
    guestItems: eligible ? deviceItems : [],
    guestMergePending: guestSyncPending,
    isSyncing: busy > 0 || (eligible && query.isFetching),
    guestMergeResults:
      attempt && attempt.account === user?.id ? attempt.results : [],
    isReadyForCheckout: Boolean(
      eligible &&
      query.isSuccess &&
      !query.isFetching &&
      !busy &&
      !hasGuestItems &&
      !guestSyncPending &&
      !selectedCart.expired &&
      selectedCart.items.length &&
      selectedCart.items.every(
        (item) => item.purchasable !== false && item.priceAvailable !== false
      )
    ),
    retryGuestMerge: async () => {
      const expectedSession = syncSession()
      mark(1)
      try {
        await client.cancelQueries({ queryKey: key })
        const cart = await loadBuyerCart({ retryRejected: true })
        if (
          syncSession().sessionId !== expectedSession.sessionId ||
          syncSession().user?.id !== user?.id
        )
          throw new Error("Your account has changed. Please try again.")
        client.setQueryData(key, cart)
        return true
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to save your bag."
        )
        return false
      } finally {
        mark(-1)
      }
    },
    updateGuestQuantity: (variant: string, quantity: number) =>
      mutateDevice((items) => {
        if (
          !Number.isSafeInteger(quantity) ||
          quantity < 1 ||
          quantity > 2147483647
        )
          throw new Error("Enter a valid whole-number quantity.")
        return items.map((item) =>
          item.variantId === variant ? { ...item, quantity } : item
        )
      }),
    removeGuestProduct: (variant: string) =>
      mutateDevice((items) =>
        items.filter((item) => item.variantId !== variant)
      ),
    error: query.error,
    refetch: query.refetch,
    addProduct: (product: Product, quantity = 1) => {
      if (
        !isProductInStock(product) ||
        !product.variantId ||
        !Number.isSafeInteger(quantity) ||
        quantity < productMinimum(product)
      ) {
        toast.error("Choose an available product option and a valid quantity.")
        return Promise.resolve(false)
      }
      if (useDeviceCart)
        return mutateDevice((items) => {
          if (
            items.length >= 100 &&
            !items.some((item) => item.variantId === product.variantId)
          )
            throw new Error("Your bag can contain up to 100 product options.")
          const existing = items.find(
            (item) => item.variantId === product.variantId
          )
          const nextQuantity = (existing?.quantity ?? 0) + quantity
          if (
            nextQuantity >
            (product.stockKnown === false ? 2147483647 : product.stock)
          )
            throw new Error("The requested quantity is unavailable.")
          const storedProduct: Product = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            image: product.image,
            category: product.category,
            stock: product.stock,
            stockKnown: product.stockKnown,
            inStock: product.inStock,
            source: product.source,
            currency: product.currency,
            variantId: product.variantId,
            sku: product.sku,
            saleUnit: product.saleUnit,
            unitsPerPack: product.unitsPerPack,
            minimumOrderQuantity: product.minimumOrderQuantity,
            active: product.active,
            createdAt: product.createdAt,
          }
          const item: CartItem = {
            productId: product.id,
            variantId: product.variantId,
            quantity: nextQuantity,
            minimum: productMinimum(product),
            product: storedProduct,
          }
          return [
            ...items.filter((row) => row.variantId !== product.variantId),
            item,
          ]
        }, `${product.name} added to your bag.`)
      return mutate(async (current) => {
        const existing = current.items.find(
          (item) => item.variantId === product.variantId
        )
        return liveCart("PUT", product.variantId, {
          quantity: (existing?.quantity ?? 0) + quantity,
        })
      }, `${product.name} added to your bag.`)
    },
    updateQuantity: (variant: string, quantity: number) =>
      !useDeviceCart
        ? mutate(() => liveCart("PUT", variant, { quantity }))
        : mutateDevice((items) =>
            items.map((item) => {
              if (item.variantId !== variant) return item
              if (
                !Number.isSafeInteger(quantity) ||
                quantity < (item.minimum ?? 1) ||
                quantity >
                  (item.product.stockKnown === false
                    ? 2147483647
                    : item.product.stock)
              )
                throw new Error("The requested quantity is unavailable.")
              return { ...item, quantity }
            })
          ),
    removeProduct: (variant: string) =>
      !useDeviceCart
        ? mutate(() => liveCart("DELETE", variant), "Item removed.")
        : mutateDevice(
            (items) => items.filter((item) => item.variantId !== variant),
            "Item removed."
          ),
    clearCart: (options: { notify?: boolean } = {}) =>
      !useDeviceCart
        ? mutate(
            () => liveCart("DELETE"),
            options.notify === false ? undefined : "Your bag has been cleared."
          )
        : mutateDevice(
            () => [],
            options.notify === false ? undefined : "Your bag has been cleared."
          ),
  }
}
