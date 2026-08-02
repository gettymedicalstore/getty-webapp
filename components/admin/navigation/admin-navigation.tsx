"use client"

import {
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Contact,
  LayoutDashboard,
  PackageSearch,
  Settings,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react"

import AdminNavigationGroup from "./admin-navigation-group"

const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: CircleDollarSign,
      },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: ShoppingBag,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: Tags,
      },
      {
        label: "Inventory",
        href: "/admin/inventory",
        icon: Boxes,
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
      },
      {
        label: "Enquiries",
        href: "/admin/enquiries",
        icon: Contact,
      },
      {
        label: "Product reviews",
        href: "/admin/reviews",
        icon: PackageSearch,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
]

type AdminNavigationProps = {
  onNavigate?: () => void
}

export default function AdminNavigation({ onNavigate }: AdminNavigationProps) {
  return (
    <nav className="space-y-6">
      {navigationGroups.map((group) => (
        <AdminNavigationGroup
          key={group.label}
          label={group.label}
          items={group.items}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}
