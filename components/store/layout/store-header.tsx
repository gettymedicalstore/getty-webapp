"use client"
import {
  ValidatedForm,
  FormInput,
} from "@/components/shared/form/validated-form"
import { searchSchema } from "@/lib/form-schemas"

import AppLogo from "@/components/shared/app-logo"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  ArrowUpRight,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  X,
  CircleHelp,
  Package,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  accountHome,
  accountRoleLabel,
  accountDashboardLabel,
} from "@/lib/auth/navigation"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useCart } from "@/features/cart/hooks/use-cart"
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist"
import CustomerAccountMenu from "@/app/(store)/_components/layout/customer-account-menu"
import CategoryMenu from "./category-menu"
import DesktopNavigation from "./desktop-navigation"
import MobileNavigation from "./mobile-navigation"

export default function StoreHeader() {
  const router = useRouter(),
    { cart } = useCart(),
    wishlist = useWishlist(),
    session = useAuthSession()
  const user = session.data?.user
  const [mobileOpen, setMobileOpen] = useState(false),
    menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!mobileOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [mobileOpen])
  function submitSearch({ search }: { search: string }) {
    if (search) {
      router.push(`/search?q=${encodeURIComponent(search)}`)
      setMobileOpen(false)
    }
  }
  function login() {
    setMobileOpen(false)
    router.push("/login")
  }
  const searchForm = (
    <ValidatedForm
      schema={searchSchema}
      role="search"
      onSubmit={submitSearch}
      className="relative w-full"
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#738479]"
        aria-hidden
      />
      <FormInput
        name="search"
        type="search"
        placeholder="What are you looking for?"
        aria-label="Search medical products"
        className="focus:border-primary h-13 w-full rounded-xl border border-[#e1e8e2] bg-[#f6f8f5] pr-14 pl-12 text-base transition outline-none focus:bg-white"
      />
      <button
        type="submit"
        aria-label="Submit product search"
        className="absolute top-1 right-1 grid size-11 place-items-center rounded-lg text-[#42674e] transition hover:bg-white"
      >
        <ArrowUpRight className="size-5" />
      </button>
    </ValidatedForm>
  )
  return (
    <header className="sticky top-0 z-50 border-b border-[#e3eae6] bg-white/95 backdrop-blur-xl">
      <div className="bg-[#123f30] text-[#d2e6d7]">
        <div className="site-container flex min-h-9 items-center justify-between gap-3 text-xs">
          <span className="min-w-0 truncate">
            {user
              ? `${accountRoleLabel(user.role)} account · ${user.tenant ?? user.name}`
              : "Medical essentials. Everyday care."}
          </span>
          <Link
            href="/contact"
            className="inline-flex min-h-9 shrink-0 items-center gap-2 hover:text-white"
          >
            <CircleHelp className="size-4" />
            Need help?
          </Link>
        </div>
      </div>
      <div className="site-container flex h-18 items-center gap-4 sm:h-22 lg:gap-8">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          aria-label="Getty Medical Store home"
          className="min-w-0 flex-1 sm:flex-none"
        >
          <AppLogo className="h-auto w-full max-w-[273px]" />
        </Link>
        <div className="hidden min-w-0 flex-1 xl:block">{searchForm}</div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <HeaderAction
              href="/wishlist"
              label="Wishlist"
              icon={Heart}
              count={wishlist.products.length}
            />
          </div>
          <HeaderAction
            href="/cart"
            label="Shopping bag"
            icon={ShoppingBag}
            count={cart.itemCount}
          />
          <button
            ref={menuButton}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="store-mobile-navigation"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((v) => !v)}
            className="grid size-12 place-items-center rounded-xl border border-[#e3eae6] text-[#2d4a38] transition hover:bg-[#f4f8f3] lg:hidden"
          >
            {mobileOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
          {session.isPending ? (
            <Skeleton className="hidden size-12 shrink-0 rounded-xl lg:block lg:w-40" />
          ) : user ? (
            <CustomerAccountMenu user={user} compactOnMobile />
          ) : (
            <Button
              variant="outline"
              onClick={login}
              className="hidden h-12 min-w-24 rounded-xl border-[#d4e3d7] px-5 text-base font-semibold text-[#324e3e] hover:bg-[#edf5ef] lg:inline-flex"
            >
              Log in
            </Button>
          )}
        </div>
      </div>
      <div className="site-container pb-3 xl:hidden">{searchForm}</div>
      <div className="hidden border-t border-[#eff2ef] lg:block">
        <div className="site-container flex min-h-18 items-center justify-between gap-4 py-3">
          <div className="flex shrink-0 items-center gap-4 xl:gap-6">
            <CategoryMenu />
            <span className="h-7 w-px bg-[#e3eae6]" />
            <DesktopNavigation />
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[15px] font-medium xl:gap-3">
            <Link
              href={
                user?.role === "customer"
                  ? "/customer/account"
                  : user
                    ? `${accountHome(user.role)}/orders`
                    : "/track-order"
              }
              className="hover:text-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-3 whitespace-nowrap text-[#52665a] transition hover:bg-[#f4f8f3]"
            >
              {user?.role === "customer" ? (
                <UserRound className="size-5" />
              ) : (
                <Package className="size-5" />
              )}
              {user
                ? user.role === "customer"
                  ? "Account"
                  : "Manage orders"
                : "Track order"}
            </Link>
            <Link
              href={user ? accountHome(user.role) : "/supplier/register"}
              className="text-primary inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#d4e3d7] px-4 font-semibold whitespace-nowrap transition hover:bg-[#edf5ef]"
            >
              {user ? accountDashboardLabel(user.role) : "Become a supplier"}
              <ArrowUpRight className="size-5" />
            </Link>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div
          id="store-mobile-navigation"
          className="max-h-[calc(100dvh-12rem)] overflow-y-auto border-t bg-white lg:hidden"
        >
          <MobileNavigation
            onNavigate={() => setMobileOpen(false)}
            onLogin={login}
          />
        </div>
      )}
    </header>
  )
}
function HeaderAction({
  href,
  label,
  icon: Icon,
  count = 0,
}: {
  href: string
  label: string
  icon: typeof Heart
  count?: number
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}${count > 0 ? `, ${count} items` : ""}`}
      className="relative grid size-12 place-items-center rounded-xl border border-[#d4e3d7] text-[#2d4a38] transition hover:border-[#bacfc0] hover:bg-[#f4f8f3]"
    >
      <Icon className="size-6" strokeWidth={1.7} />
      {count > 0 && (
        <span className="bg-primary absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
