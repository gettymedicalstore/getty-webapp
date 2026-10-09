export const metadata = {
  title: "Forgot password",
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
      key="email"
      step="email"
      returnTo={safeReturnPath(params.redirect) ?? undefined}
    />
  )
}
