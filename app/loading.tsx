import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
export default function Loading() {
  return (
    <div className="site-container py-10">
      <DashboardSkeleton />
    </div>
  )
}
