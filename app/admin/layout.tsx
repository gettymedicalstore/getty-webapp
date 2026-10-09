import type { ReactNode } from "react"
import PortalShell from "@/components/shared/portal-shell"
import AuthBoundary from "@/features/auth/components/auth-boundary"
export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AuthBoundary roles={["admin"]}>
      <PortalShell>{children}</PortalShell>
    </AuthBoundary>
  )
}
