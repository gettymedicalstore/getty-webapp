"use client"

import {
  Heart,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  ShoppingCart,
  User,
} from "lucide-react"

import CustomerNavigationGroup from "./customer-navigation-group"

const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/customer",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Shopping",
    items: [
      {
        label: "My Orders",
        href: "/customer/orders",
        icon: Package,
      },
      {
        label: "Wishlist",
        href: "/wishlist",
        icon: Heart,
      },
      {
        label: "Cart",
        href: "/cart",
        icon: ShoppingCart,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Profile",
        href: "/customer/profile",
        icon: User,
      },
      {
        label: "Addresses",
        href: "/customer/addresses",
        icon: MapPin,
      },
      {
        label: "Settings",
        href: "/customer/settings",
        icon: Settings,
      },
    ],
  },
]

type CustomerNavigationProps = {
  onNavigate?: () => void
}

export default function CustomerNavigation({
  onNavigate,
}: CustomerNavigationProps) {
  return (
    <nav className="space-y-6">
      {navigationGroups.map((group) => (
        <CustomerNavigationGroup
          key={group.label}
          label={group.label}
          items={group.items}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}
