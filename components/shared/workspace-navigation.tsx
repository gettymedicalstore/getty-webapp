"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  workspaceMenus,
  isWorkspaceLinkActive,
  type WorkspaceRole,
  type WorkspaceLink,
  type WorkspaceGroup,
} from "@/lib/navigation/workspace-menu"

type NavigationAppearance = "light" | "dark"

export default function WorkspaceNavigation({
  role,
  onNavigate,
  appearance = "light",
}: {
  role: WorkspaceRole
  onNavigate?: () => void
  appearance?: NavigationAppearance
}) {
  const pathname = usePathname()
  return (
    <nav
      aria-label={`${role === "supplier" ? "Vendor" : role === "customer" ? "Consumer" : "Admin"} navigation`}
    >
      <ul className="space-y-1">
        {workspaceMenus[role].map((item) => (
          <li key={item.label}>
            {"children" in item ? (
              <ProductGroup
                key={pathname}
                group={item}
                pathname={pathname}
                onNavigate={onNavigate}
                appearance={appearance}
              />
            ) : (
              <NavigationLink
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                appearance={appearance}
              />
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function NavigationLink({
  item,
  pathname,
  onNavigate,
  nested = false,
  appearance,
}: {
  item: WorkspaceLink
  pathname: string
  onNavigate?: () => void
  nested?: boolean
  appearance: NavigationAppearance
}) {
  const active = isWorkspaceLinkActive(item, pathname)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
        appearance === "dark"
          ? "focus-visible:ring-[#9ed6bf]"
          : "focus-visible:ring-[#24694b]",
        appearance === "dark"
          ? active
            ? "bg-[#1b5b47] font-semibold text-white"
            : "font-medium text-[#c3d8cf] hover:bg-[#104f3c] hover:text-white"
          : active
            ? "bg-[#194c3c] font-semibold text-white shadow-[0_2px_3px_rgba(15,56,40,.08)]"
            : "font-medium text-[#5e6f63] hover:bg-[#f1f5f2] hover:text-[#243a2d]",
        nested && "px-3"
      )}
    >
      <Icon
        aria-hidden
        className={nested ? "size-[18px] shrink-0" : "size-5 shrink-0"}
        strokeWidth={1.75}
      />
      {item.label}
    </Link>
  )
}

function ProductGroup({
  group,
  pathname,
  onNavigate,
  appearance,
}: {
  group: WorkspaceGroup
  pathname: string
  onNavigate?: () => void
  appearance: NavigationAppearance
}) {
  const [expanded, setExpanded] = useState(true)
  const id = useId()
  const Icon = group.icon
  const active = group.children.some((item) =>
    isWorkspaceLinkActive(item, pathname)
  )
  return (
    <>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
          appearance === "dark"
            ? "hover:bg-[#104f3c] hover:text-white focus-visible:ring-[#9ed6bf]"
            : "hover:bg-[#f1f5f2] focus-visible:ring-[#24694b]",
          appearance === "dark"
            ? active
              ? "font-semibold text-white"
              : "text-[#c3d8cf]"
            : active
              ? "font-semibold text-[#294b36]"
              : "text-[#5e6f63]"
        )}
      >
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform",
            !expanded && "-rotate-90"
          )}
        />
      </button>
      <ul
        id={id}
        hidden={!expanded}
        className={cn(
          "my-2 ml-5 space-y-1 border-l pl-3",
          appearance === "dark" ? "border-[#2c5b49]" : "border-[#e6ebe7]"
        )}
      >
        {group.children.map((item) => (
          <li key={item.href}>
            <NavigationLink
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              nested
              appearance={appearance}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
