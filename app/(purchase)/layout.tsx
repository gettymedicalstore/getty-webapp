import type { ReactNode } from "react"
import PurchaseProgress from "@/components/shared/purchase-progress"
import StoreHeader from "@/components/store/layout/store-header"
import StoreFooter from "@/components/store/layout/store-footer"

export default function PurchaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f9f5]">
      <StoreHeader />
      <PurchaseProgress />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <StoreFooter />
    </div>
  )
}
