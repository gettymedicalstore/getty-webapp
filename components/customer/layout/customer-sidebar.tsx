import Link from "next/link"
import AppLogo from "@/components/shared/app-logo"

import CustomerNavigation from "../navigation/customer-navigation"

export default function CustomerSidebar() {
  return (
    <aside className="bg-background fixed inset-y-0 left-0 z-40 hidden w-72 border-r lg:flex lg:flex-col">
      <div className="flex h-20 items-center px-7">
        <Link href="/customer" className="leading-tight">
          <AppLogo className="h-auto w-full max-w-[210px]" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <CustomerNavigation />
      </div>

      <div className="border-t p-4">
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-xl px-3 py-3 text-xs font-medium transition"
        >
          Return to storefront
        </Link>
      </div>
    </aside>
  )
}
