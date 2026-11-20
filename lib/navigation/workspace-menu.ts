import {
  House,
  Store,
  Package,
  LayoutGrid,
  BadgePercent,
  Boxes,
  ClipboardList,
  UserRound,
  UsersRound,
  Star,
  type LucideIcon,
} from "lucide-react"

export type WorkspaceRole = "admin" | "supplier" | "customer"
export type WorkspaceLink = {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
  aliases?: string[]
  profileAdminsOnly?: boolean
  sectionLabel?: string
}
export type WorkspaceGroup = {
  label: string
  icon: LucideIcon
  children: WorkspaceLink[]
  sectionLabel?: string
}
export type WorkspaceItem = WorkspaceLink | WorkspaceGroup

function productGroup(base: string): WorkspaceGroup {
  return {
    label: "Product",
    icon: Package,
    children: [
      { label: "Taxes", href: `${base}/taxes`, icon: BadgePercent },
      { label: "Products", href: `${base}/products`, icon: Package },
      { label: "Inventory", href: `${base}/inventory`, icon: Boxes },
    ],
  }
}

export const workspaceMenus: Record<WorkspaceRole, WorkspaceItem[]> = {
  admin: [
    {
      label: "Dashboard",
      href: "/admin",
      icon: House,
      exact: true,
      sectionLabel: "Administration",
    },
    {
      label: "Vendors",
      href: "/admin/vendors",
      icon: Store,
      aliases: ["/admin/suppliers"],
    },
    { label: "Customers", href: "/admin/customers", icon: UsersRound },
    {
      label: "Users",
      href: "/admin/users",
      icon: UserRound,
      profileAdminsOnly: true,
    },
    { label: "Orders", href: "/admin/orders", icon: ClipboardList },
    {
      label: "Catalogue controls",
      icon: LayoutGrid,
      children: [
        { label: "Categories", href: "/admin/categories", icon: LayoutGrid },
        { label: "All products", href: "/admin/all-products", icon: Boxes },
        { label: "Featured products", href: "/admin/featured", icon: Star },
      ],
    },
    { ...productGroup("/admin"), sectionLabel: "My Product & stock" },
  ],
  customer: [
    { label: "Orders", href: "/customer/orders", icon: ClipboardList },
    {
      label: "Account",
      href: "/customer/account",
      icon: UserRound,
      aliases: [
        "/customer/profile",
        "/customer/addresses",
        "/customer/settings",
      ],
    },
  ],
  supplier: [
    {
      label: "Orders",
      href: "/supplier/orders",
      icon: ClipboardList,
    },
    productGroup("/supplier"),
    {
      label: "Account",
      href: "/supplier/account",
      icon: UserRound,
      aliases: [
        "/supplier/profile",
        "/supplier/settings",
        "/supplier/registration",
      ],
    },
  ],
}

export function isWorkspaceLinkActive(item: WorkspaceLink, pathname: string) {
  const path = pathname.replace(/\/+$/, "")
  return [item.href, ...(item.aliases ?? [])].some(
    (href) => path === href || (!item.exact && path.startsWith(`${href}/`))
  )
}

export function workspacePageTitle(role: WorkspaceRole, pathname: string) {
  if (role === "admin" && pathname === "/admin/payments")
    return "Payment recovery"
  if (role === "admin" && pathname === "/admin/fulfilment")
    return "Order fulfilment"
  if (
    /^\/(admin|supplier|customer)\/orders\/[^/]+$/.test(pathname) ||
    /^\/admin\/fulfilment\/[^/]+$/.test(pathname)
  )
    return "Order details"
  return (
    workspaceMenus[role]
      .flatMap((item) => ("children" in item ? item.children : [item]))
      .find((item) => isWorkspaceLinkActive(item, pathname))?.label ?? "Account"
  )
}
