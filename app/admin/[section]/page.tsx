import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import OrdersPage from "@/features/orders/components/orders-page"
import PaymentRecoveryPage from "@/features/orders/components/payment-recovery-page"
import ManagementPage from "@/features/admin/components/management-page"
import InventoryPage from "@/features/inventory/components/inventory-page"
import Settings from "@/features/customer/components/settings"
import ProfileForm from "@/features/customer/components/profile-form"
import AdminDashboard from "@/features/admin/components/admin-dashboard"
import TaxesPage from "@/features/admin/components/taxes-page"
import CategoriesPage from "@/features/admin/components/categories-page"
import FeaturedPage from "@/features/featured/components/featured-page"
import AllProductsPage from "@/features/admin/components/all-products-page"
export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (section === "orders") return <OrdersPage workspace="admin" />
  if (section === "payments") return <PaymentRecoveryPage />
  if (section === "all-products") return <AllProductsPage />
  if (section === "featured") return <FeaturedPage />
  if (section === "suppliers") redirect("/admin/vendors")
  if (section === "taxes") return <TaxesPage />
  if (section === "categories") return <CategoriesPage />
  if (section === "settings") return <Settings />
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
