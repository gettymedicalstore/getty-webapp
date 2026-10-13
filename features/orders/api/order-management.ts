import { z } from "zod"
import { apiData } from "@/lib/api/data"

export type OrderAudience = "customer" | "vendor"
export const orderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "expired",
] as const
export const itemStatuses = [
  "pending",
  "accepted",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const
export const actions = [
  "accept",
  "ship",
  "deliver",
  "cancel",
  "request-return",
  "approve-return",
  "reject-return",
  "receive-return",
] as const
export type OrderAction = (typeof actions)[number]
const money = z.number().finite().nonnegative()
export const orderSummarySchema = z.object({
  id: z.string().min(1),
  reference: z.string(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.enum(orderStatuses),
  placed: z.string(),
  total: money,
  cursor: z.number().int().nonnegative().optional(),
  subtotal: money.optional(),
  discount: money.optional(),
  tax: money.optional(),
  shipping: money.optional(),
  commission: money.optional(),
  net: z.number().finite().optional(),
})
export const orderPageSchema = z.object({
  items: z.array(orderSummarySchema),
  records: z.number().int().nonnegative(),
  isNext: z.boolean(),
  isPrevious: z.boolean(),
  nextCursor: z.number().int().nonnegative(),
  previousCursor: z.number().int().nonnegative(),
})
export const orderLineSchema = z.object({
  id: z.string().min(1),
  seller: z.string().optional(),
  product: z.string(),
  variant: z.string(),
  name: z.string(),
  sku: z.string(),
  options: z
    .record(
      z.string(),
      z.union([z.string(), z.number().finite(), z.boolean(), z.null()])
    )
    .optional(),
  unit: z.string(),
  pack: z.number().int().positive(),
  quantity: z.number().int().positive(),
  price: money,
  total: money,
  discount: money.optional(),
  tax: money.optional(),
  taxes: z
    .array(
      z.object({
        name: z.string(),
        rate: z.number().finite().nonnegative(),
        amount: money,
      })
    )
    .optional(),
  shipping: money.optional(),
  commission: money.optional(),
  status: z.enum(itemStatuses),
  version: z.number().int().positive(),
  tracking: z
    .object({
      carrier: z.string().nullish(),
      tracking: z.string().nullish(),
      number: z.string().nullish(),
    })
    .nullish(),
  received: z.string().nullish(),
  returnstate: z.enum([
    "none",
    "requested",
    "approved",
    "rejected",
    "received",
  ]),
})
export const orderPaymentSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["charge", "refund"]),
  status: z.string(),
  amount: money,
  currency: z.string().regex(/^[A-Z]{3}$/),
  settled: z.string().nullish(),
  method: z.string().nullish(),
})
export const orderDetailSchema = orderSummarySchema.extend({
  version: z.number().int().positive().optional(),
  modified: z.string().nullish(),
  expires: z.string().nullish(),
  notes: z.string().nullish(),
  delivery: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postcode: z.string().nullish(),
  }),
  items: z.array(orderLineSchema),
  payments: z.array(orderPaymentSchema).optional(),
  history: z
    .array(
      z.object({
        id: z.string(),
        item: z.string().nullish(),
        action: z.string(),
        before: z.string().nullish(),
        after: z.string().nullish(),
        reason: z.string().nullish(),
        entry: z.string(),
      })
    )
    .optional(),
})
export type ManagedOrder = z.infer<typeof orderDetailSchema>
export type OrderSummary = z.infer<typeof orderSummarySchema>
export type OrderLine = z.infer<typeof orderLineSchema>
export type OrderPage = z.infer<typeof orderPageSchema>
export const dateFiltersSchema = z
  .object({
    from: z.iso.date("Choose a valid start date."),
    through: z.iso.date("Choose a valid end date."),
    status: z.enum(["", ...orderStatuses]),
    itemStatus: z.enum(["", ...itemStatuses]),
  })
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value.from)) &&
      Number.isFinite(Date.parse(value.through)) &&
      value.from <= value.through,
    {
      path: ["through"],
      message: "End date must be on or after the start date.",
    }
  )
export type OrderDateFilters = z.infer<typeof dateFiltersSchema>
export function defaultOrderFilters(now = new Date()): OrderDateFilters {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  return {
    from: `${today.slice(0, 7)}-01`,
    through: today,
    status: "",
    itemStatus: "",
  }
}
/** Dates in the workspace are Lagos calendar days; the API end boundary is exclusive. */
export function orderDateBounds(filters: OrderDateFilters) {
  dateFiltersSchema.parse(filters)
  const end = new Date(`${filters.through}T00:00:00+01:00`)
  end.setUTCDate(end.getUTCDate() + 1)
  return {
    starts: new Date(`${filters.from}T00:00:00+01:00`).toISOString(),
    end: end.toISOString(),
  }
}
export async function getOrders(
  audience: OrderAudience,
  filters: OrderDateFilters,
  cursor = 0,
  navigation: "next" | "previous" = "next"
) {
  const q = new URLSearchParams({
    ...orderDateBounds(filters),
    cursor: String(cursor),
    navigation,
    limit: "20",
  })
  if (filters.status) q.set("status", filters.status)
  if (audience === "vendor" && filters.itemStatus)
    q.set("itemStatus", filters.itemStatus)
  return orderPageSchema.parse(
    await apiData(
      `/getty/v1/order${audience === "vendor" ? "/vendor" : ""}?${q}`
    )
  )
}
export async function getOrder(audience: OrderAudience, order: string) {
  return orderDetailSchema.parse(
    await apiData(
      `/getty/v1/order${audience === "vendor" ? "/vendor" : ""}/${encodeURIComponent(order)}`
    )
  )
}
export const actionSchema = z
  .object({
    token: z.uuid(),
    version: z.number().int().positive(),
    action: z.enum(actions),
    reason: z.string().trim().max(1000).optional(),
    carrier: z.string().trim().max(100).optional(),
    tracking: z.string().trim().max(200).optional(),
    restock: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.action === "cancel" || value.action.includes("return")) &&
      !value.reason
    )
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Enter a reason for this action.",
      })
    if (value.action === "ship")
      for (const key of ["carrier", "tracking"] as const)
        if (!value[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `Enter the ${key === "carrier" ? "delivery carrier" : "tracking number"}.`,
          })
    if (value.action === "receive-return" && value.restock === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["restock"],
        message: "Choose whether the inspected item can return to stock.",
      })
  })
export type OrderActionPayload = z.infer<typeof actionSchema>
export async function actOnOrderLine(
  audience: OrderAudience,
  order: string,
  item: string,
  input: OrderActionPayload
) {
  const body = actionSchema.parse(input)
  if (
    audience === "customer" &&
    !["deliver", "cancel", "request-return"].includes(body.action)
  )
    throw new Error("This action is only available to the seller.")
  return orderDetailSchema.parse(
    await apiData(
      `/getty/v1/order${audience === "vendor" ? "/vendor" : ""}/${encodeURIComponent(order)}/items/${encodeURIComponent(item)}/actions`,
      { method: "POST", body: JSON.stringify(body) }
    )
  )
}
export async function cancelOrder(
  order: string,
  body: { token: string; version: number; reason: string }
) {
  const parsed = z
    .object({
      token: z.uuid(),
      version: z.number().int().positive(),
      reason: z.string().trim().min(1).max(1000),
    })
    .parse(body)
  return orderDetailSchema.parse(
    await apiData(`/getty/v1/order/${encodeURIComponent(order)}/cancel`, {
      method: "POST",
      body: JSON.stringify(parsed),
    })
  )
}
export function availableLineActions(
  audience: OrderAudience,
  order: ManagedOrder,
  line: OrderLine,
  now = Date.now()
): OrderAction[] {
  if (["cancelled", "expired"].includes(order.status)) return []
  if (audience === "customer") {
    if (line.status === "pending") return ["cancel"]
    if (line.status === "shipped") return ["deliver"]
    if (
      line.status === "delivered" &&
      line.returnstate === "none" &&
      line.received &&
      now >= Date.parse(line.received) &&
      now <= Date.parse(line.received) + 14 * 86400000
    )
      return ["request-return"]
    return []
  }
  if (line.status === "pending")
    return order.status === "pending" ? ["cancel"] : ["accept", "cancel"]
  if (line.status === "accepted") return ["ship", "cancel"]
  if (line.returnstate === "requested")
    return ["approve-return", "reject-return"]
  if (line.returnstate === "approved") return ["receive-return"]
  return []
}
export const recoveryPaymentSchema = orderPaymentSchema.extend({
  purchase: z.string(),
  failure: z.string().nullish(),
  link: z.string().nullish(),
})
export type RecoveryPayment = z.infer<typeof recoveryPaymentSchema>
export async function getRecoveryPayments(filters: OrderDateFilters) {
  return z
    .array(recoveryPaymentSchema)
    .parse(
      await apiData(
        `/getty/v1/order/support/payments?${new URLSearchParams({ ...orderDateBounds(filters), limit: "100" })}`
      )
    )
}
export async function reconcilePayment(payment: string) {
  return recoveryPaymentSchema.parse(
    await apiData(
      `/getty/v1/order/support/payments/${encodeURIComponent(payment)}/reconcile`,
      { method: "POST" }
    )
  )
}
export async function retryRefund(payment: RecoveryPayment, token: string) {
  if (payment.kind !== "refund" || payment.status !== "failed")
    throw new Error("Only a confirmed failed refund can be retried.")
  return recoveryPaymentSchema.parse(
    await apiData(
      `/getty/v1/order/support/payments/${encodeURIComponent(payment.id)}/retry-refund`,
      { method: "POST", body: JSON.stringify({ token: z.uuid().parse(token) }) }
    )
  )
}
