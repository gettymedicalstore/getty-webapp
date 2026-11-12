import { apiData } from "@/lib/api/data"
import { trackingSchema } from "@/lib/form-schemas"
import {
  orderDetailSchema,
  type ManagedOrder,
  type OrderAudience,
} from "./order-management"
export type TrackOrderInput = { orderNumber: string }

/** Printed codes resolve only within the signed-in buyer or supplier scope. */
export async function trackOrder(
  input: TrackOrderInput,
  audience: OrderAudience
): Promise<ManagedOrder> {
  const { orderNumber } = trackingSchema.parse(input)
  return orderDetailSchema.parse(
    await apiData(
      `/getty/v1/order${audience === "vendor" ? "/vendor" : ""}/code/${encodeURIComponent(orderNumber.trim())}`
    )
  )
}
