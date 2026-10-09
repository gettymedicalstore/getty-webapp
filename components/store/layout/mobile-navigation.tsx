"use client"
import { ArrowUpRight, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { Skeleton } from "@/components/ui/skeleton"
import {
  accountHome,
  accountRoleLabel,
  accountDashboardLabel,
} from "@/lib/auth/navigation"
const links = [
  { label: "Home", href: "/" },
  { label: "Shop all products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Contact us", href: "/contact" },
]
export default function MobileNavigation({
  onNavigate,
  onLogin,
}: {
  onNavigate: () => void
  onLogin: () => void
}) {
  const session = useAuthSession(),
    pathname = usePathname(),
    user = session.data?.user
  return (
    <nav aria-label="Mobile navigation" className="site-container py-5">
      {user && (
        <div className="mb-4 rounded-2xl border border-[#d4e3d7] bg-[#f4f8f3] p-4">
          <p className="text-primary text-xs font-semibold">
            {accountRoleLabel(user.role)} account
          </p>
          <p className="mt-1 font-semibold break-words text-[#213e30]">
            {user.name}
          </p>
          <p className="mt-1 text-sm break-words text-[#64716b]">
            {user.tenant ?? user.email}
          </p>
        </div>
      )}
      <div className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={pathname === link.href ? "page" : undefined}
            className={`flex min-h-13 items-center justify-between rounded-xl px-4 text-base font-medium ${pathname === link.href ? "text-primary bg-[#edf5eb]" : "hover:bg-muted text-[#425d4c]"}`}
          >
            {link.label}
            <ChevronRight className="size-5 text-[#91a096]" />
          </Link>
        ))}
        <Link
          href={user ? `${accountHome(user.role)}/orders` : "/track-order"}
          onClick={onNavigate}
          className="hover:bg-muted flex min-h-13 items-center justify-between rounded-xl px-4 text-base font-medium text-[#425d4c]"
        >
          {user
            ? user.role === "customer"
              ? "My orders"
              : "Manage orders"
            : "Track order"}
          <ChevronRight className="size-5 text-[#91a096]" />
        </Link>
      </div>
      <div className="mt-5 grid gap-3 border-t pt-5">
        {session.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : user ? (
          <Link
            onClick={onNavigate}
            href={
              user.role === "customer"
                ? "/customer/account"
                : accountHome(user.role)
            }
            className="bg-primary flex min-h-12 items-center justify-center rounded-xl px-4 py-3 text-center text-base font-semibold text-white"
          >
            {user.role === "customer"
              ? "Account"
              : accountDashboardLabel(user.role)}
          </Link>
        ) : (
          <Button onClick={onLogin} className="h-12 rounded-xl">
            Log in to your account
          </Button>
        )}
        {(!user || user.role === "customer") && (
          <Link
            href="/supplier/register"
            onClick={onNavigate}
            className="text-primary flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d4e3d7] px-4 text-base font-semibold hover:bg-[#edf5ef]"
          >
            Become a supplier
            <ArrowUpRight className="size-5" />
          </Link>
        )}
      </div>
    </nav>
  )
}
