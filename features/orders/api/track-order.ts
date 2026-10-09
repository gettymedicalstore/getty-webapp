import { unavailable } from "@/lib/api/client"
import type { TrackedOrder } from "../types/order"
export type TrackOrderInput = { orderNumber: string }
export async function trackOrder(
  _input: TrackOrderInput
): Promise<TrackedOrder | null> {
  void _input
  return unavailable(
    "Order tracking is temporarily unavailable. Please contact support with your order reference."
  )
}
