import type { LucideIcon } from "lucide-react"

import CustomerNavItem from "./customer-nav-item"

type NavigationItem = {
  label: string
  href: string
  icon: LucideIcon
}

type CustomerNavigationGroupProps = {
  label: string
  items: NavigationItem[]
  onNavigate?: () => void
}

export default function CustomerNavigationGroup({
  label,
  items,
  onNavigate,
}: CustomerNavigationGroupProps) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 px-3 text-[10px] font-bold tracking-[0.16em] uppercase">
        {label}
      </p>

      <div className="space-y-1">
        {items.map((item) => (
          <CustomerNavItem key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}
