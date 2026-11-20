import { z } from "zod"
import { gettyUrl } from "@/lib/api/config"
import { trackingSchema } from "@/lib/form-schemas"

export const fulfilmentStates = [
  "placed",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
  "cancelled",
  "expired",
] as const

const publicTrackingSchema = z.object({
  orderCode: z.string().regex(/^[0-9]{4}-[0-9A-HJKMNP-TV-Z]{4}$/),
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "completed",
    "cancelled",
    "expired",
  ]),
  fulfilment: z.enum(fulfilmentStates),
  placed: z.iso.datetime({ offset: true }),
  estimatedDelivery: z
    .object({
      earliest: z.iso.date(),
      latest: z.iso.date(),
      timezone: z.string().min(1),
    })
    .nullable(),
  timeline: z.array(
    z.object({
      status: z.enum(fulfilmentStates),
      at: z.iso.datetime({ offset: true }),
    })
  ),
})

export type PublicTracking = z.infer<typeof publicTrackingSchema>
export type TrackOrderInput = { orderNumber: string }

export class PublicTrackingError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfterSeconds: number | null = null
  ) {
    super(message)
  }
}

export function normalizeOrderCode(input: string) {
  return trackingSchema.parse({ orderNumber: input }).orderNumber
}

export function retryAfterSeconds(
  header: string | null,
  bodySeconds: unknown,
  now = Date.now()
) {
  const seconds = header === null ? NaN : Number(header)
  const dateDelay = header === null ? NaN : (Date.parse(header) - now) / 1000
  const fallback = Number(bodySeconds)
  const value =
    Number.isFinite(seconds) && seconds > 0
      ? seconds
      : Number.isFinite(dateDelay) && dateDelay > 0
        ? dateDelay
        : Number.isFinite(fallback) && fallback > 0
          ? fallback
          : 300
  return Math.ceil(value)
}

/** Independent of the signed-in client and its refresh/logout interceptors. */
export async function trackOrder(
  input: TrackOrderInput,
  signal?: AbortSignal
): Promise<PublicTracking> {
  const orderCode = normalizeOrderCode(input.orderNumber)
  let response: Response
  try {
    response = await fetch(
      gettyUrl(
        `/getty/ecommerce/orders/tracking/${encodeURIComponent(orderCode)}`
      ),
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit",
        cache: "no-store",
        signal,
      }
    )
  } catch (error) {
    if (signal?.aborted) throw error
    throw new PublicTrackingError(
      "Tracking is temporarily unavailable. Please try again shortly.",
      503
    )
  }
  const body = await response.json().catch(() => null)
  if (response.status === 429)
    throw new PublicTrackingError(
      "Tracking limit reached. Try again shortly.",
      429,
      retryAfterSeconds(
        response.headers.get("Retry-After"),
        body?.retryAfterSeconds
      )
    )
  if (response.status === 404)
    throw new PublicTrackingError(
      "We could not find that order. Check the order number and try again.",
      404
    )
  if (response.status === 400)
    throw new PublicTrackingError(
      "Enter an order number such as 2611-K7P4.",
      400
    )
  if (!response.ok)
    throw new PublicTrackingError(
      response.status >= 500
        ? "Tracking is temporarily unavailable. Please try again shortly."
        : "Tracking update unavailable. Please try again.",
      response.status
    )
  const parsed = publicTrackingSchema.safeParse(body?.data)
  if (body?.success !== true || !parsed.success)
    throw new PublicTrackingError(
      "Tracking update unavailable. Please try again.",
      502
    )
  return parsed.data
}
