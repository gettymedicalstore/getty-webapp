import AdminHeader from "@/components/admin/layout/admin-header"
import AdminSidebar from "@/components/admin/layout/admin-sidebar"

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[#f5f6f7]">
      <AdminSidebar />

      <div className="lg:pl-72">
        <AdminHeader />

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
