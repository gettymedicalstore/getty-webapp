import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import OrdersPage from "@/features/orders/components/orders-page"
import ManagementPage from "@/features/admin/components/management-page"
import InventoryPage from "@/features/inventory/components/inventory-page"
import Settings from "@/features/customer/components/settings"
import ProfileForm from "@/features/customer/components/profile-form"
import AccountPage from "@/features/customer/components/account-page"
import TaxesPage from "@/features/admin/components/taxes-page"
export default async function SupplierSection({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (section === "orders") return <OrdersPage workspace="supplier" />
  if (section === "payments")
    return <OrdersPage workspace="supplier" payments />
  if (section === "account") return <AccountPage />
  if (section === "taxes") return <TaxesPage />
  if (section === "settings") return <Settings />
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
