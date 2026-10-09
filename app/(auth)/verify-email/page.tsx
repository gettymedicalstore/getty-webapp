export const metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
}
import ConsumerSignup from "@/features/auth/components/consumer-signup"
import { safeReturnPath } from "@/lib/auth/navigation"
export const dynamic = "force-dynamic"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const params = await searchParams
  const returnTo = safeReturnPath(params.redirect) ?? undefined
  return <ConsumerSignup step="verify" returnTo={returnTo} />
}
