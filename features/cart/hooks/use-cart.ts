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
import { readSession } from "@/features/auth/api/session-store"
import { liveCart, canUseBuyerCart } from "../api/live-cart"
import {
  deviceCart,
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
    queryFn: loadBuyerCart,
    staleTime: 0,
    retry: false,
  })
  function mutate(operation: (cart: Cart) => Promise<Cart>, message?: string) {
    const sessionId = readSession().sessionId
    const userId = user?.id
    mark(1)
    const next = mutations
      .then(async () => {
        if (
          readSession().user?.id !== userId ||
          readSession().sessionId !== sessionId
        )
          throw new Error("Your account has changed. Please try again.")
        await client.cancelQueries({ queryKey: key })
        const current = await liveCart()
        const result = await operation(current)
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
      if (!saveDeviceItems(operation(readDeviceItems())))
        throw new Error("Your bag could not be saved on this device.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update your bag."
      )
      return Promise.resolve(false)
    }
    if (message) toast.success(message)
    if (eligible && query.isError) void query.refetch()
    return Promise.resolve(true)
  }
  const useDeviceCart = !eligible || (query.isError && deviceItems.length > 0)
  const selectedCart = useDeviceCart
    ? deviceCart(deviceItems)
    : (query.data ?? deviceCart([]))
  return {
    cart: selectedCart,
    requiresBuyerAccount: false,
    isPending: session.isPending || Boolean(eligible && query.isPending),
    isUpdating: busy > 0,
    isError: Boolean(eligible && query.isError && !useDeviceCart),
    syncError: Boolean(eligible && query.isError && useDeviceCart),
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
