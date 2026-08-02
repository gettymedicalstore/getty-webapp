import Link from "next/link"

import CustomerNavigation from "../navigation/customer-navigation"

export default function CustomerSidebar() {
  return (
    <aside className="bg-background fixed inset-y-0 left-0 z-40 hidden w-72 border-r lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/customer" className="leading-tight">
          <span className="text-primary block text-lg font-black">
            Getty Medical
          </span>
          <span className="text-muted-foreground block text-[10px] font-bold tracking-[0.18em] uppercase">
            Customer Account
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <CustomerNavigation />
      </div>

      <div className="border-t p-4">
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-3 py-2 text-sm font-medium transition"
        >
          Return to storefront
        </Link>
      </div>
    </aside>
  )
}
