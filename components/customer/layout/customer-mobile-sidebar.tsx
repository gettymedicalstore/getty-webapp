"use client"

import { X } from "lucide-react"
import Link from "next/link"

import CustomerNavigation from "../navigation/customer-navigation"

type CustomerMobileSidebarProps = {
  open: boolean
  onClose: () => void
}

export default function CustomerMobileSidebar({
  open,
  onClose,
}: CustomerMobileSidebarProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <aside className="bg-background relative h-full w-[85%] max-w-sm shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link href="/customer" onClick={onClose}>
            <span className="text-primary block font-black">Getty Medical</span>
            <span className="text-muted-foreground block text-[10px] font-bold tracking-[0.16em] uppercase">
              Customer Account
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-md border"
            aria-label="Close customer navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <CustomerNavigation onNavigate={onClose} />
        </div>
      </aside>
    </div>
  )
}
