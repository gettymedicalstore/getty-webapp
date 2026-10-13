import { z } from "zod"
import { GettyIdSchema } from "@/lib/api/getty-contract"
import { apiData } from "@/lib/api/data"
import { deliverySchema, type Delivery } from "../schemas/checkout-schema"

const amount = z.number().finite().nonnegative()
const paymentStatus = z.enum([
  "created",
  "pending",
  "unknown",
  "succeeded",
  "failed",
  "cancelled",
])
export const paymentSummarySchema = z.object({
  id: GettyIdSchema,
  kind: z.enum(["charge", "refund"]),
  status: paymentStatus,
  amount,
  currency: z.string(),
  settled: z.string().nullable().optional(),
})
export const paymentSchema = paymentSummarySchema.extend({
  purchase: GettyIdSchema,
  link: z.string().nullable(),
  failure: z.string().nullable(),
})
export type Payment = z.infer<typeof paymentSchema>
export const purchaseSchema = z.object({
  id: GettyIdSchema,
  reference: z.string(),
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "completed",
    "cancelled",
    "expired",
  ]),
  currency: z.string(),
  subtotal: amount,
  shipping: amount,
  total: amount,
  expires: z.string().nullable(),
  payments: z.array(paymentSummarySchema),
})
export type Purchase = z.infer<typeof purchaseSchema>
export const previewSchema = z.object({
  cart: GettyIdSchema,
  currency: z.literal("NGN"),
  delivery: deliverySchema,
  quote: z.string().regex(/^[a-f0-9]{64}$/i),
  subtotal: amount,
  shipping: amount,
  total: amount,
  items: z
    .array(
      z.object({
        variant: GettyIdSchema,
        name: z.string(),
        quantity: z.number().int().positive(),
        price: amount,
        unit: z.string(),
        pack: z.number(),
      })
    )
    .min(1),
})
export type CheckoutPreview = z.infer<typeof previewSchema>
export const checkoutCommandSchema = z.object({
  token: z.string().uuid(),
  cart: GettyIdSchema,
  quote: z.string().length(64),
  delivery: deliverySchema,
  notes: z.string().max(1000).nullable(),
})
export type CheckoutCommand = z.infer<typeof checkoutCommandSchema>
const root = "/getty/v1/order"
export async function previewCheckout(delivery: Delivery) {
  return previewSchema.parse(
    await apiData(`${root}/checkout/preview`, {
      method: "POST",
      body: JSON.stringify(deliverySchema.parse(delivery)),
    })
  )
}
export async function placeOrder(command: CheckoutCommand) {
  return purchaseSchema.parse(
    await apiData(`${root}/checkout`, {
      method: "POST",
      body: JSON.stringify(checkoutCommandSchema.parse(command)),
    })
  )
}
export async function getPurchase(order: string, signal?: AbortSignal) {
  const result = purchaseSchema.parse(
    await apiData(`${root}/${GettyIdSchema.parse(order)}`, { signal })
  )
  if (result.id !== order)
    throw new Error("The response does not match this order.")
  return result
}
export async function startPayment(order: string, token: string) {
  const result = paymentSchema.parse(
    await apiData(`${root}/${GettyIdSchema.parse(order)}/payments`, {
      method: "POST",
      body: JSON.stringify({ token: z.string().uuid().parse(token) }),
    })
  )
  if (result.purchase !== order)
    throw new Error("The payment does not match this order.")
  return result
}
export async function getPayment(
  order: string,
  payment: string,
  signal?: AbortSignal
) {
  const result = paymentSchema.parse(
    await apiData(
      `${root}/${GettyIdSchema.parse(order)}/payments/${GettyIdSchema.parse(payment)}`,
      { signal }
    )
  )
  if (result.purchase !== order || result.id !== payment)
    throw new Error("The payment does not match this order.")
  return result
}
export const money = (value: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value)
export function awaitingPayment(order: Purchase, now = Date.now()) {
  return (
    order.status === "pending" &&
    Boolean(order.expires && Date.parse(order.expires) > now)
  )
}
export function blockingCharge(order: Purchase) {
  return order.payments.find(
    (p) =>
      p.kind === "charge" &&
      ["created", "pending", "unknown", "succeeded"].includes(p.status)
  )
}
export function hostedPaymentLink(
  order: Purchase,
  payment?: Payment,
  now = Date.now()
) {
  if (
    !payment ||
    payment.purchase !== order.id ||
    payment.kind !== "charge" ||
    payment.status !== "pending" ||
    !awaitingPayment(order, now) ||
    !payment.link
  )
    return null
  try {
    const url = new URL(payment.link)
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
