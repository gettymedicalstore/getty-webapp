import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import ManagementPage from "@/features/admin/components/management-page"
import InventoryPage from "@/features/inventory/components/inventory-page"
import CreateAccount from "@/features/admin/components/create-account"
import Settings from "@/features/customer/components/settings"
import ProfileForm from "@/features/customer/components/profile-form"
import AdminDashboard from "@/features/admin/components/admin-dashboard"
import TaxesPage from "@/features/admin/components/taxes-page"
import CategoriesPage from "@/features/admin/components/categories-page"
export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (section === "suppliers") redirect("/admin/vendors")
  if (section === "taxes") return <TaxesPage />
  if (section === "categories") return <CategoriesPage />
  if (section === "settings")
    return (
      <div className="space-y-6">
        <Settings />
        {<CreateAccount kind="profile" />}
        <Suspense fallback={<TableSkeleton />}>
          <ManagementPage section="profiles" />
        </Suspense>
      </div>
    )
  if (section === "inventory") return <InventoryPage />
  if (section === "profile") return <ProfileForm />
  if (section === "analytics") return <AdminDashboard />
  if (
    ![
      "products",
      "inventory",
      "orders",
      "payments",
      "customers",
      "vendors",
      "enquiries",
      "reviews",
    ].includes(section)
  )
    notFound()
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ManagementPage
        key={section}
        section={section === "vendors" ? "suppliers" : section}
      />
    </Suspense>
  )
}
