import { Suspense } from "react"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import ManagementPage from "./management-page"

export default function TaxesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ManagementPage section="taxes" />
    </Suspense>
  )
}
