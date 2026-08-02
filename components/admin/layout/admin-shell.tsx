import type { ReactNode } from "react"

import AdminHeader from "./admin-header"
import AdminSidebar from "./admin-sidebar"

type AdminShellProps = {
  children: ReactNode
}

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="bg-muted/30 min-h-screen">
      <AdminSidebar />

      <div className="lg:pl-72">
        <AdminHeader />

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
