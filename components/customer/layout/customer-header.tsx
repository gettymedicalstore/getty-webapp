"use client"

import { Bell, Menu, Search } from "lucide-react"
import { useState } from "react"

import CustomerMobileSidebar from "./customer-mobile-sidebar"
import CustomerUserMenu from "./customer-user-menu"

export default function CustomerHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="bg-background/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid size-10 place-items-center rounded-md border lg:hidden"
          aria-label="Open customer navigation"
        >
          <Menu className="size-5" />
        </button>

        <div className="relative hidden max-w-md flex-1 md:block">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

          <input
            type="search"
            placeholder="Search orders or products..."
            className="bg-background focus:border-primary h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-md border"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            <span className="bg-primary absolute top-1.5 right-1.5 size-2 rounded-full" />
          </button>

          <CustomerUserMenu />
        </div>
      </header>

      <CustomerMobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  )
}
