import type { CheckoutPaymentMode } from "@/features/checkout/types/payment"

export type OrderPaymentStatus =
  "pending" | "partially-paid" | "paid" | "failed"

export type CheckoutOrderItem = {
  productId: string
  quantity: number
}

export type CheckoutOrder = {
  id: string
  reference: string
  paymentReference?: string
  paystackAccessCode?: string
  customerId?: string
  email: string
  items: CheckoutOrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  expectedAmountKobo: number
  paymentMode: CheckoutPaymentMode
  paymentStatus: OrderPaymentStatus
  paidAmountKobo: number
  paystackPlanCode?: string
  frequency?: "weekly" | "monthly"
  installmentCount?: number
  createdAt: string
  updatedAt: string
}

const orderStore = new Map<string, CheckoutOrder>()

export function createCheckoutOrder(order: CheckoutOrder) {
  const normalizedOrder = normalizeOrder(order)

  if (orderStore.has(normalizedOrder.reference)) {
    throw new Error(
      `An order with reference ${normalizedOrder.reference} already exists.`
    )
  }

  orderStore.set(normalizedOrder.reference, normalizedOrder)

  return normalizedOrder
}

export function findOrderByReference(reference: string) {
  const normalizedReference = normalizeReference(reference)

  if (!normalizedReference) {
    return null
  }

  return orderStore.get(normalizedReference) ?? null
}

export function findOrderById(id: string) {
  const normalizedId = id.trim()

  if (!normalizedId) {
    return null
  }

  return (
    Array.from(orderStore.values()).find(
      (order) => order.id === normalizedId
    ) ?? null
  )
}

export function findOrderByPaymentReference(paymentReference: string) {
  const normalizedPaymentReference = normalizeReference(paymentReference)

  if (!normalizedPaymentReference) {
    return null
  }

  return (
    Array.from(orderStore.values()).find(
      (order) =>
        normalizeReference(order.paymentReference) ===
        normalizedPaymentReference
    ) ?? null
  )
}

export function findOrderByAnyReference(reference: string) {
  return (
    findOrderByReference(reference) ?? findOrderByPaymentReference(reference)
  )
}

export function findOrdersByCustomerEmail(email: string) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return []
  }

  return Array.from(orderStore.values())
    .filter((order) => normalizeEmail(order.email) === normalizedEmail)
    .sort(sortNewestFirst)
}

export function findOrdersByCustomerId(customerId: string) {
  const normalizedCustomerId = customerId.trim()

  if (!normalizedCustomerId) {
    return []
  }

  return Array.from(orderStore.values())
    .filter((order) => order.customerId === normalizedCustomerId)
    .sort(sortNewestFirst)
}

export function findCustomerOrders(input: {
  customerId?: string
  email?: string
}) {
  if (input.customerId?.trim()) {
    return findOrdersByCustomerId(input.customerId)
  }

  if (input.email?.trim()) {
    return findOrdersByCustomerEmail(input.email)
  }

  return []
}

export function getAllOrders() {
  return Array.from(orderStore.values()).sort(sortNewestFirst)
}

export function updateOrderByReference(
  reference: string,
  changes: Partial<CheckoutOrder>
) {
  const normalizedReference = normalizeReference(reference)
  const current = orderStore.get(normalizedReference)

  if (!current) {
    return null
  }

  const updated = normalizeOrder({
    ...current,
    ...changes,
    id: current.id,
    reference: current.reference,
    updatedAt: new Date().toISOString(),
  })

  orderStore.set(current.reference, updated)

  return updated
}

export function updateOrderByPaymentReference(
  paymentReference: string,
  changes: Partial<CheckoutOrder>
) {
  const order = findOrderByPaymentReference(paymentReference)

  if (!order) {
    return null
  }

  return updateOrderByReference(order.reference, changes)
}

export function deleteOrderByReference(reference: string) {
  const normalizedReference = normalizeReference(reference)

  if (!normalizedReference) {
    return false
  }

  return orderStore.delete(normalizedReference)
}

export function clearOrderStore() {
  orderStore.clear()
}

function normalizeOrder(order: CheckoutOrder): CheckoutOrder {
  const reference = normalizeReference(order.reference)
  const email = normalizeEmail(order.email)

  if (!order.id.trim()) {
    throw new Error("Order ID is required.")
  }

  if (!reference) {
    throw new Error("Order reference is required.")
  }

  if (!email) {
    throw new Error("Customer email is required.")
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error("An order must contain at least one item.")
  }

  return {
    ...order,
    id: order.id.trim(),
    reference,
    paymentReference: order.paymentReference
      ? normalizeReference(order.paymentReference)
      : undefined,
    paystackAccessCode: order.paystackAccessCode?.trim() || undefined,
    customerId: order.customerId?.trim() || undefined,
    email,
    items: order.items.map((item) => ({
      productId: item.productId.trim(),
      quantity: normalizeQuantity(item.quantity),
    })),
    subtotal: normalizeAmount(order.subtotal),
    deliveryFee: normalizeAmount(order.deliveryFee),
    total: normalizeAmount(order.total),
    expectedAmountKobo: normalizeKobo(order.expectedAmountKobo),
    paidAmountKobo: normalizeKobo(order.paidAmountKobo),
    createdAt: normalizeDate(order.createdAt),
    updatedAt: normalizeDate(order.updatedAt),
  }
}

function normalizeReference(value: string | undefined) {
  return value?.trim() ?? ""
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function normalizeQuantity(value: number) {
  const quantity = Number(value)

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Order item quantity must be a positive integer.")
  }

  return quantity
}

function normalizeAmount(value: number) {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Order amount must be a valid non-negative number.")
  }

  return amount
}

function normalizeKobo(value: number) {
  const amount = Number(value)

  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Kobo amount must be a non-negative integer.")
  }

  return amount
}

function normalizeDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error("Order date is invalid.")
  }

  return date.toISOString()
}

function sortNewestFirst(first: CheckoutOrder, second: CheckoutOrder) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  )
}
