"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type CustomerNavItemProps = {
  label: string
  href: string
  icon: LucideIcon
  onNavigate?: () => void
}

export default function CustomerNavItem({
  label,
  href,
  icon: Icon,
  onNavigate,
}: CustomerNavItemProps) {
  const pathname = usePathname()

  const active =
    href === "/customer" ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  )
}
