import StoreFooter from "@/components/store/layout/store-footer"
import StoreHeader from "@/components/store/layout/store-header"

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StoreHeader />

      <main id="main-content" className="min-w-0 flex-1">
        {children}
      </main>

      <StoreFooter />
    </div>
  )
}
