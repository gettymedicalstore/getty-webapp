import CustomerHeader from "@/components/customer/layout/customer-header"
import CustomerSidebar from "@/components/customer/layout/customer-sidebar"

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <CustomerHeader />

      <div className="mx-auto flex max-w-[1440px]">
        <CustomerSidebar />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
