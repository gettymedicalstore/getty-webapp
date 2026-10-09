import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import ManagementPage from "@/features/admin/components/management-page"
import InventoryPage from "@/features/inventory/components/inventory-page"
import CreateAccount from "@/features/admin/components/create-account"
import Settings from "@/features/customer/components/settings"
import ProfileForm from "@/features/customer/components/profile-form"
import AccountPage from "@/features/customer/components/account-page"
import TaxesPage from "@/features/admin/components/taxes-page"
import PageHeading from "@/components/shared/page-heading"
export default async function SupplierSection({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (section === "account") return <AccountPage />
  if (section === "taxes") return <TaxesPage />
  if (section === "settings")
    return (
      <div className="space-y-6">
        <Settings />
        <div className="max-w-6xl border-t border-[#e0e8e2] pt-7">
          <PageHeading
            title="Team profiles"
            description="People with access to your organisation’s workspace."
            action={<CreateAccount kind="profile" />}
          />
        </div>
        <div className="max-w-6xl">
          <Suspense fallback={<TableSkeleton />}>
            <ManagementPage section="profiles" hideHeading />
          </Suspense>
        </div>
      </div>
    )
  if (section === "inventory") return <InventoryPage />
  if (section === "profile") return <ProfileForm />
  if (!["products", "orders", "payments", "inventory"].includes(section))
    notFound()
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ManagementPage section={section} />
    </Suspense>
  )
}
