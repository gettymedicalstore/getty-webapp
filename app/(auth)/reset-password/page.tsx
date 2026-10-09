export const metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
}
import ForgotPasswordFlow from "@/features/auth/components/reset-password/forgot-password-flow"
import { safeReturnPath } from "@/lib/auth/navigation"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const params = await searchParams
  return (
    <ForgotPasswordFlow
      key="password"
      step="password"
      returnTo={safeReturnPath(params.redirect) ?? undefined}
    />
  )
}
