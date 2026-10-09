import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import ProductWorkspace from "@/features/admin/components/product-workspace"

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ProductWorkspace productId={id} workspace="admin" />
    </Suspense>
  )
}
