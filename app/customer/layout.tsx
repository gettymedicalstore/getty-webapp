import PortalShell from "@/components/shared/portal-shell"
import AuthBoundary from "@/features/auth/components/auth-boundary"

export default async function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthBoundary roles={["customer"]}>
      <PortalShell role="customer">{children}</PortalShell>
    </AuthBoundary>
  )
}
