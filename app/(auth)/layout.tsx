import type { ReactNode } from "react"
import AuthShell from "@/components/shared/auth-shell"
import RecoveryProvider from "@/features/auth/components/reset-password/recovery-provider"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <RecoveryProvider>
      <AuthShell>{children}</AuthShell>
    </RecoveryProvider>
  )
}
