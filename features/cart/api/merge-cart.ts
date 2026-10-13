import { z } from "zod"
import { apiRequest, GettyApiError } from "@/lib/api/client"
import {
  CartItemInputSchema,
  CartSchema,
  GettyIdSchema,
} from "@/lib/api/getty-contract"
import { mapBackendCart } from "../server/map-cart"

export const GuestMergeRequestSchema = z.object({
  token: GettyIdSchema,
  items: z
    .array(CartItemInputSchema.extend({ variant: GettyIdSchema }))
    .min(1)
    .max(100),
})
export const GuestMergeResultSchema = z.object({
  variant: z.string(),
  quantity: z.number().int().safe().positive(),
  status: z.enum(["merged", "rejected"]),
  resultingQuantity: z.number().int().safe().nonnegative().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  existing: z.number().int().safe().nonnegative().optional(),
  requested: z.number().int().safe().nonnegative().optional(),
  available: z.number().int().safe().nonnegative().optional(),
  minimum: z.number().int().safe().positive().optional(),
})
const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    token: GettyIdSchema,
    replayed: z.boolean(),
    results: z.array(GuestMergeResultSchema),
    cart: CartSchema,
  }),
})
export type GuestMergeRequest = z.infer<typeof GuestMergeRequestSchema>
export type GuestMergeResult = z.infer<typeof GuestMergeResultSchema>

export async function mergeBuyerCart(input: GuestMergeRequest) {
  const request = GuestMergeRequestSchema.safeParse(input)
  if (!request.success)
    throw new GettyApiError(
      "Check your saved items and quantities before moving them to your account.",
      400
    )
  const response = responseSchema.safeParse(
    await apiRequest("/getty/v1/order/cart/merge", {
      method: "POST",
      body: JSON.stringify(request.data),
    })
  )
  if (!response.success || response.data.data.token !== request.data.token)
    throw new GettyApiError(
      "Your bag update could not be confirmed. Try again to check its status."
    )
  const data = response.data.data
  // An incomplete receipt is ambiguous. Retain the identical request for replay.
  if (
    data.results.length !== request.data.items.length ||
    request.data.items.some((item) => {
      const matches = data.results.filter(
        (result) => result.variant === item.variant
      )
      return matches.length !== 1 || matches[0].quantity !== item.quantity
    })
  )
    throw new GettyApiError(
      "Your saved bag update is incomplete. Try again to check its status."
    )
  return { ...data, cart: mapBackendCart(data.cart) }
}
