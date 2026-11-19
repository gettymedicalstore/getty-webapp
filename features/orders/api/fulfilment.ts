import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { GettyApiError } from "@/lib/api/client"
import {
  fulfilmentStatuses,
  orderDetailSchema,
  orderPaymentSchema,
  orderStatuses,
  supplySchema,
  trackingSchema,
  type ManagedOrder,
} from "./order-management"

const id = z.string().min(1)
const version = z.number().int().positive()
const amount = z.number().finite().nonnegative()
const deliverySchema = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postcode: z.string().nullish(),
})
export const operationsItemSchema = z.object({
  id,
  seller: z.string().optional(),
  name: z.string(),
  variant: z.string().optional(),
  quantity: z.number().int().positive(),
  unit: z.string().nullish(),
  pack: z.number().int().positive().nullish(),
  price: amount.nullish(),
  total: amount.nullish(),
  discount: amount.nullish(),
  tax: amount.nullish(),
  shipping: amount.nullish(),
  options: z.record(z.string(), z.unknown()).nullish(),
  status: z.string(),
  version,
  supply: supplySchema,
})
export const operationsOrderSchema = z.object({
  id,
  parcelPhoto: z
    .object({
      fileId: z.string().min(1),
      stage: z.string(),
      accessPath: z.string().min(1),
    })
    .nullish(),
  orderCode: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(orderStatuses).optional(),
  fulfilment: z.enum(fulfilmentStatuses),
  version,
  delivery: deliverySchema.optional(),
  tracking: trackingSchema.optional(),
  placed: z.string().optional(),
  currency: z.string().optional(),
  total: amount.optional(),
  subtotal: amount.nullish(),
  discount: amount.nullish(),
  tax: amount.nullish(),
  shipping: amount.nullish(),
  notes: z.string().nullish(),
  payments: z.array(orderPaymentSchema).nullish(),
  items: z.array(operationsItemSchema),
  history: z
    .array(
      z.object({
        id,
        action: z.string(),
        before: z.string().nullish(),
        after: z.string().nullish(),
        reason: z.string().nullish(),
        entry: z.string(),
        actor: z
          .union([
            z.string(),
            z.object({
              name: z.string().optional(),
              id: z.string().optional(),
            }),
          ])
          .nullish(),
      })
    )
    .optional(),
})
export const operationsPageSchema = z.object({
  items: z.array(
    z.object({
      id,
      reference: z.string().optional(),
      orderCode: z.string().optional(),
      currency: z.string(),
      status: z.enum(orderStatuses),
      fulfilment: z.enum(fulfilmentStatuses),
      placed: z.string(),
      cursor: z.number().int().nonnegative().optional(),
      version,
      total: amount,
      delivery: deliverySchema.optional(),
    })
  ),
  records: z.number().int().nonnegative(),
  isNext: z.boolean(),
  isPrevious: z.boolean(),
  nextCursor: z.number().int().nonnegative(),
  previousCursor: z.number().int().nonnegative(),
})
export type OperationsOrder = z.infer<typeof operationsOrderSchema>
export type OperationsItem = z.infer<typeof operationsItemSchema>
export type OperationsPage = z.infer<typeof operationsPageSchema>

export const fulfilmentFiltersSchema = z
  .object({
    from: z.iso.date(),
    through: z.iso.date(),
    fulfilment: z.enum(["", ...fulfilmentStatuses]),
  })
  .refine((value) => value.from <= value.through, {
    path: ["through"],
    message: "End date must be on or after the start date.",
  })
export type FulfilmentFilters = z.infer<typeof fulfilmentFiltersSchema>

/** Send date-only bounds; `end` remains exclusive so `through` is included. */
export function fulfilmentDateBounds(filters: FulfilmentFilters) {
  fulfilmentFiltersSchema.parse(filters)
  const dayAfter = new Date(`${filters.through}T00:00:00Z`)
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
  return {
    starts: filters.from,
    end: dayAfter.toISOString().slice(0, 10),
  }
}

export async function getFulfilmentQueue(
  filters: FulfilmentFilters,
  cursor = 0,
  navigation: "next" | "previous" = "next"
): Promise<OperationsPage> {
  const query = new URLSearchParams({
    ...fulfilmentDateBounds(filters),
    cursor: String(cursor),
    navigation,
    limit: "20",
  })
  if (filters.fulfilment) query.set("fulfilment", filters.fulfilment)
  return operationsPageSchema.parse(
    await apiData(`/getty/v1/order/fulfilment?${query}`)
  )
}

export async function getFulfilmentOrder(
  orderId: string
): Promise<OperationsOrder> {
  return operationsOrderSchema.parse(
    await apiData(`/getty/v1/order/fulfilment/${encodeURIComponent(orderId)}`)
  )
}

export const fulfilmentActionSchema = z
  .object({
    orderId: id,
    token: z.uuid(),
    version,
    action: z.enum(["preparing", "ready", "dispatch", "deliver"]),
    carrier: z.string().trim().max(100).optional(),
    tracking: z.string().trim().max(200).optional(),
    recipient: z.string().trim().max(120).optional(),
    proof: z.string().trim().max(500).optional(),
    parcelPhotoFileId: z.uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.parcelPhotoFileId &&
      value.action !== "ready" &&
      value.action !== "dispatch"
    )
      ctx.addIssue({
        code: "custom",
        path: ["parcelPhotoFileId"],
        message:
          "A parcel photo can only be attached when ready or dispatching.",
      })
    if (value.action === "dispatch") {
      if (!value.carrier)
        ctx.addIssue({
          code: "custom",
          path: ["carrier"],
          message: "Enter the carrier.",
        })
      if (!value.tracking)
        ctx.addIssue({
          code: "custom",
          path: ["tracking"],
          message: "Enter the tracking reference.",
        })
    }
  })
export type FulfilmentAction = z.infer<typeof fulfilmentActionSchema>["action"]

export const supplyActionSchema = z
  .object({
    orderId: id,
    itemId: id,
    token: z.uuid(),
    version,
    action: z.enum(["accept", "supply", "receive", "return-to-vendor"]),
    reference: z.string().trim().max(200).optional(),
    reason: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action !== "accept" && !value.reference)
      ctx.addIssue({
        code: "custom",
        path: ["reference"],
        message: "Enter a handover or receipt reference.",
      })
    if (value.action === "return-to-vendor" && !value.reason)
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Explain the physical return.",
      })
  })
export type SupplyAction = z.infer<typeof supplyActionSchema>["action"]

export function canAdvanceFulfilment(
  order: OperationsOrder
): FulfilmentAction | null {
  if (order.status === "confirmed" && order.fulfilment === "placed")
    return "preparing"
  const active = order.items.filter(
    (item) => item.supply.status !== "cancelled" && item.status !== "cancelled"
  )
  if (active.length > 0 && order.fulfilment === "preparing") return "ready"
  if (active.length > 0 && order.fulfilment === "ready") return "dispatch"
  if (order.fulfilment === "dispatched") return "deliver"
  return null
}

export function supplierActionFor(
  order: ManagedOrder,
  item: ManagedOrder["items"][number]
): SupplyAction | null {
  if (order.fulfilment !== "preparing" || order.status !== "processing")
    return null
  if (item.status === "cancelled" || !item.supply) return null
  if (item.supply.status === "pending") return "accept"
  if (item.supply.status === "accepted") return "supply"
  return null
}

export function operationsSupplyActions(
  order: OperationsOrder,
  item: OperationsItem
): Array<"receive" | "return-to-vendor"> {
  if (
    ["dispatched", "delivered", "cancelled", "expired"].includes(
      order.fulfilment
    )
  )
    return []
  if (item.status === "cancelled") return []
  if (item.supply.status === "supplied") return ["receive", "return-to-vendor"]
  if (item.supply.status === "received") return ["return-to-vendor"]
  return []
}

export async function postFulfilmentAction(
  input: z.input<typeof fulfilmentActionSchema>,
  audience: "customer"
): Promise<ManagedOrder>
export async function postFulfilmentAction(
  input: z.input<typeof fulfilmentActionSchema>,
  audience: "operations"
): Promise<OperationsOrder>
export async function postFulfilmentAction(
  input: z.input<typeof fulfilmentActionSchema>,
  audience: "customer" | "operations"
) {
  const body = fulfilmentActionSchema.parse(input)
  if (
    audience === "customer" &&
    (body.action !== "deliver" ||
      body.carrier ||
      body.tracking ||
      body.recipient ||
      body.proof ||
      body.parcelPhotoFileId)
  )
    throw new Error("Customers may only confirm receipt of their entire order.")
  if (
    audience === "operations" &&
    body.action === "deliver" &&
    (!body.recipient || !body.proof)
  )
    throw new Error("Enter the recipient and delivery evidence reference.")
  const result = await apiData("/getty/v1/order/actions", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return audience === "customer"
    ? orderDetailSchema.parse(result)
    : operationsOrderSchema.parse(result)
}

export async function postOperationsActionWithPhotoRetry(
  input: z.input<typeof fulfilmentActionSchema>,
  beforeRetry: () => void
): Promise<OperationsOrder> {
  try {
    return await postFulfilmentAction(input, "operations")
  } catch (cause) {
    if (
      !input.parcelPhotoFileId ||
      !(cause instanceof GettyApiError) ||
      cause.status !== 404 ||
      !/parcel photo was not found/i.test(cause.message)
    )
      throw cause
    // Preserve the action token if the attachment has not reached the order service.
    await new Promise<void>((resolve) => setTimeout(resolve, 750))
    beforeRetry()
    return postFulfilmentAction(input, "operations")
  }
}

export async function postSupplyAction(
  input: z.input<typeof supplyActionSchema>,
  audience: "vendor"
): Promise<ManagedOrder>
export async function postSupplyAction(
  input: z.input<typeof supplyActionSchema>,
  audience: "operations"
): Promise<OperationsOrder>
export async function postSupplyAction(
  input: z.input<typeof supplyActionSchema>,
  audience: "vendor" | "operations"
) {
  const body = supplyActionSchema.parse(input)
  if (audience === "vendor" && !["accept", "supply"].includes(body.action))
    throw new Error("Suppliers may only accept or hand over their own items.")
  if (
    audience === "operations" &&
    !["receive", "return-to-vendor"].includes(body.action)
  )
    throw new Error("This custody action is only available to the supplier.")
  const result = await apiData("/getty/v1/order/supply/actions", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return audience === "vendor"
    ? orderDetailSchema.parse(result)
    : operationsOrderSchema.parse(result)
}
