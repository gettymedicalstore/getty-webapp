import type { TrackedOrder } from "../types/order"

export type TrackOrderInput = {
  orderNumber: string
  email: string
}

export async function trackOrder(
  input: TrackOrderInput
): Promise<TrackedOrder | null> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  if (
    input.orderNumber.toUpperCase() !== "GMS-2026-000125" ||
    input.email.toLowerCase() !== "customer@example.com"
  ) {
    return null
  }

  return {
    orderNumber: "GMS-2026-000125",
    customerEmail: "customer@example.com",
    status: "processing",
    createdAt: "2026-07-21T10:00:00.000Z",
    estimatedDelivery: "2026-07-25T18:00:00.000Z",
    deliveryAddress: "Lagos, Nigeria",
    timeline: [
      {
        status: "confirmed",
        label: "Order confirmed",
        completed: true,
        date: "2026-07-21T10:05:00.000Z",
      },
      {
        status: "processing",
        label: "Preparing your order",
        completed: true,
        date: "2026-07-22T08:30:00.000Z",
      },
      {
        status: "shipped",
        label: "Order shipped",
        completed: false,
      },
      {
        status: "delivered",
        label: "Order delivered",
        completed: false,
      },
    ],
  }
}
