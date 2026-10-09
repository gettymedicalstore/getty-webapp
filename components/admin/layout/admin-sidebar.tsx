import Link from "next/link"
import AppLogo from "@/components/shared/app-logo"

import AdminNavigation from "../navigation/admin-navigation"

export default function AdminSidebar() {
  return (
    <aside className="bg-background fixed inset-y-0 left-0 z-40 hidden w-72 border-r lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/admin" className="leading-tight">
          <AppLogo className="h-auto w-full max-w-[210px]" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AdminNavigation />
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
