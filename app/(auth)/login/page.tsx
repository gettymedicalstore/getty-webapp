export const metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
}
import LoginPageForm from "./login-page-form"
import { safeReturnPath } from "@/lib/auth/navigation"
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reauthenticate?: string }>
}) {
  const params = await searchParams
  return (
    <LoginPageForm
      redirectTo={safeReturnPath(params.redirect) ?? undefined}
      reauthenticate={params.reauthenticate === "1"}
    />
  )
}
