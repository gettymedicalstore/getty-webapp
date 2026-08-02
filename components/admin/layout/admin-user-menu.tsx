"use client"

import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function AdminUserMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-md border px-2 sm:px-3"
      >
        <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-full text-xs font-bold">
          AD
        </span>

        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold">Administrator</span>
          <span className="text-muted-foreground block text-[10px]">
            Admin account
          </span>
        </span>

        <ChevronDown className="text-muted-foreground size-4" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div className="bg-background absolute top-12 right-0 z-50 w-56 overflow-hidden rounded-md border shadow-xl">
            <Link
              href="/admin/profile"
              onClick={() => setOpen(false)}
              className="hover:bg-muted flex items-center gap-3 px-4 py-3 text-sm"
            >
              <User className="size-4" />
              Profile
            </Link>

            <Link
              href="/admin/settings"
              onClick={() => setOpen(false)}
              className="hover:bg-muted flex items-center gap-3 px-4 py-3 text-sm"
            >
              <Settings className="size-4" />
              Settings
            </Link>

            <button
              type="button"
              className="text-destructive hover:bg-muted flex w-full items-center gap-3 border-t px-4 py-3 text-left text-sm"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
