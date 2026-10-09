import { NextResponse } from "next/server"
export function GET(request: Request) {
  const source = new URL(request.url)
  const target = new URL("/checkout/callback", source.origin)
  const reference =
    source.searchParams.get("reference") ?? source.searchParams.get("trxref")
  if (reference) target.searchParams.set("reference", reference)
  return NextResponse.redirect(target)
}
