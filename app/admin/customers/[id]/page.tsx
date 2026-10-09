import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import TenantWorkspace from "@/features/admin/components/tenant-workspace"

export default async function AccountDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TenantWorkspace tenantId={id} kind="customers" />
    </Suspense>
  )
}
