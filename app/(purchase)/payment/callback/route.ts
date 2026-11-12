import { NextResponse } from "next/server"
import { GettyIdSchema } from "@/lib/api/getty-contract"

export function GET(request: Request) {
  const source = new URL(request.url)
  const target = new URL("/checkout/callback", source.origin)
  const order = GettyIdSchema.safeParse(source.searchParams.get("order"))
  if (order.success) target.searchParams.set("order", order.data)
  // Provider query parameters are untrusted. The return page checks Getty's
  // order/payment records rather than treating a redirect as proof of payment.
  return NextResponse.redirect(target)
}
