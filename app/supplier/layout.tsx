import type { ReactNode } from "react"
import PortalShell from "@/components/shared/portal-shell"
import AuthBoundary from "@/features/auth/components/auth-boundary"
export default function SupplierLayout({ children }: { children: ReactNode }) {
  return (
    <AuthBoundary roles={["supplier"]}>
      <PortalShell role="supplier">{children}</PortalShell>
    </AuthBoundary>
  )
}
