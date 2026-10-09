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
      <p className="mb-2 px-3 text-[10px] font-medium tracking-[0.13em] text-[#64715b] uppercase">
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
