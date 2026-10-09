import { apiRequest, GettyApiError } from "@/lib/api/client"
import {
  GettyIdSchema,
  CartResponseSchema,
  CartItemInputSchema,
} from "@/lib/api/getty-contract"
import { mapBackendCart } from "../server/map-cart"
import { syncSession } from "@/features/auth/api/session-store"
import type { GettyUser } from "@/features/auth/types/session"
import { Role } from "@/lib/auth/roles"

export function canUseBuyerCart(
  user: Pick<GettyUser, "role"> | null | undefined
) {
  return user?.role === Role.CUSTOMER
}
export async function liveCart(
  method = "GET",
  variant?: string,
  input?: unknown
) {
  const session = syncSession()
  if (session.user && !canUseBuyerCart(session.user))
    throw new GettyApiError(
      "Use a customer account to manage a shopping bag.",
      403
    )
  if (variant && !GettyIdSchema.safeParse(variant).success)
    throw new GettyApiError("Choose a valid product option.", 400)
  let body: string | undefined
  if (method === "PUT") {
    const parsed = CartItemInputSchema.safeParse(input)
    if (!parsed.success)
      throw new GettyApiError("Enter a valid whole number of packs.", 400)
    body = JSON.stringify(parsed.data)
  }
  const path = `/getty/v1/order/cart${method === "GET" ? "" : `/items${variant ? `/${variant}` : ""}`}`
  const parsed = CartResponseSchema.safeParse(
    await apiRequest(path, { method, body })
  )
  if (!parsed.success)
    throw new GettyApiError("The cart response is incomplete.")
  return mapBackendCart(parsed.data.data)
}
