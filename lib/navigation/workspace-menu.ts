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
}
export type WorkspaceGroup = {
  label: string
  icon: LucideIcon
  children: WorkspaceLink[]
}
export type WorkspaceItem = WorkspaceLink | WorkspaceGroup

function productGroup(
  base: string,
  includeCategories: boolean
): WorkspaceGroup {
  return {
    label: "Product",
    icon: Package,
    children: [
      ...(includeCategories
        ? [
            {
              label: "Categories",
              href: `${base}/categories`,
              icon: LayoutGrid,
            },
          ]
        : []),
      { label: "Taxes", href: `${base}/taxes`, icon: BadgePercent },
      { label: "Products", href: `${base}/products`, icon: Package },
      ...(base === "/admin"
        ? [{ label: "All products", href: "/admin/all-products", icon: Boxes }]
        : []),
      { label: "Inventory", href: `${base}/inventory`, icon: Boxes },
    ],
  }
}

export const workspaceMenus: Record<WorkspaceRole, WorkspaceItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: House, exact: true },
    {
      label: "Vendors",
      href: "/admin/vendors",
      icon: Store,
      aliases: ["/admin/suppliers"],
    },
    { label: "Customers", href: "/admin/customers", icon: UsersRound },
    productGroup("/admin", true),
    { label: "Featured products", href: "/admin/featured", icon: Star },
    { label: "Orders", href: "/admin/orders", icon: ClipboardList },
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
    productGroup("/supplier", false),
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
  if (/^\/(admin|supplier|customer)\/orders\/[^/]+$/.test(pathname))
    return "Order details"
  return (
    workspaceMenus[role]
      .flatMap((item) => ("children" in item ? item.children : [item]))
      .find((item) => isWorkspaceLinkActive(item, pathname))?.label ?? "Account"
  )
}
