import type { ReactNode } from "react"

import CustomerHeader from "./customer-header"
import CustomerSidebar from "./customer-sidebar"

type CustomerShellProps = {
  children: ReactNode
}

export default function CustomerShell({ children }: CustomerShellProps) {
  return (
    <div className="bg-muted/30 min-h-screen">
      <CustomerSidebar />

      <div className="lg:pl-72">
        <CustomerHeader />

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
