"use client"

import AppLogo from "@/components/shared/app-logo"
import { AlertCircled } from "@/components/svgs"
import { Button } from "@/components/ui/button"
import { useAuthDialog } from "@/features/auth/components/auth-dialog-provider"
import { useCart } from "@/features/cart/hooks/use-cart"
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist"
import { Heart, Menu, Search, ShoppingCart, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type SyntheticEvent } from "react"

import CategoryMenu from "./category-menu"
import DesktopNavigation from "./desktop-navigation"
import MobileNavigation from "./mobile-navigation"

export default function StoreHeader() {
  const router = useRouter()
  const { openLogin } = useAuthDialog()
  const { cart } = useCart()
  const wishlist = useWishlist()

  const [search, setSearch] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)

  function submitSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = search.trim()

    if (!query) {
      return
    }

    router.push(`/search?q=${encodeURIComponent(query)}`)
    setMobileOpen(false)
  }

  function handleLogin() {
    openLogin({
      onSuccess: () => {
        setMobileOpen(false)
      },
    })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/5">
      <div className="font-inter flex h-11.25 items-center bg-[#00341F] py-3.5">
        <div className="font-inter mx-auto flex h-full w-full max-w-330 items-center justify-between gap-4 px-4 text-[14px] leading-[110%] font-medium tracking-normal text-white xl:px-0">
          <span>
            Contact: <Link href="tel:+2348100000000">(+234) 810 000 0000</Link>
          </span>

          <div className="hidden items-center gap-5 sm:flex">
            <Link
              href="mailto:info@gettymedicalstore.com"
              className="hover:underline"
            >
              info@gettymedicalstore.com
            </Link>

            <Link
              href="/contact"
              className="flex items-center gap-1 hover:underline"
            >
              <AlertCircled />
              Need help
            </Link>
          </div>
        </div>
      </div>

      <div className="flex h-21 w-full items-center justify-center bg-[#F5F5F5] px-4 xl:px-0">
        <div className="flex h-full w-full max-w-330 items-center justify-between gap-4 py-5">
          <Link
            href="/"
            className="shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <AppLogo />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid size-10 shrink-0 place-items-center rounded-md border border-black/10 lg:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X aria-hidden className="size-5" />
            ) : (
              <Menu aria-hidden className="size-5" />
            )}
          </button>

          <form
            onSubmit={submitSearch}
            className="relative hidden w-103.5 lg:block"
          >
            <Search
              aria-hidden
              className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-black/35"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search medical products, categories, or SKU"
              aria-label="Search products"
              className="focus:border-primary font-geist h-11 w-full rounded-xl border border-[#D5D7DA] bg-white px-2.5 py-2.5 pl-11 text-base text-[#252B37] shadow-[0px_1px_2px_0px_#0A0D120D] transition outline-none focus:text-[#252B37]"
            />
          </form>

          <nav className="hidden w-59.75 items-center gap-1 sm:gap-2 lg:flex">
            <Button type="button" onClick={handleLogin} className="w-17.25">
              Login
            </Button>
            <Link
              href="/supplier/register"
              className="text-primary inline-flex h-10 w-39.5 items-center justify-center rounded-md bg-[#D7FFEE] px-4 text-sm font-medium transition-colors hover:bg-[#D7FFEE]/80"
            >
              Become a Supplier
            </Link>
            {/* <Button
              asChild
              className="text-primary w-39.5 bg-[#D7FFEE] hover:bg-[#D7FFEE]/80"
            >
              <Link href="/supplier/register">Become a Supplier</Link>
            </Button> */}
          </nav>
        </div>
      </div>

      <div className="hidden h-18.75 w-full items-center justify-center bg-[#FDFDFD] px-4 xl:flex xl:px-0">
        <div className="flex h-full w-full max-w-330 items-center justify-between gap-4 py-5">
          <div className="flex w-full items-center gap-8 lg:w-120">
            <CategoryMenu />
            <DesktopNavigation />
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/track-order"
              className="h-11 w-fit cursor-pointer rounded-xl border border-[#D5D7DA] px-4.5 py-2.5 shadow-[0px_1px_2px_0px_#0A0D120D] hover:bg-black/1"
            >
              Track Order
            </Link>

            <HeaderAction
              href="/wishlist"
              label="Wishlist"
              icon={Heart}
              count={wishlist.products.length}
            />

            <HeaderAction
              href="/cart"
              label="Cart"
              icon={ShoppingCart}
              count={cart.itemCount}
            />
          </nav>
        </div>
      </div>

      {mobileOpen && (
        <MobileNavigation
          onNavigate={() => setMobileOpen(false)}
          onLogin={handleLogin}
        />
      )}
    </header>
  )
}

type HeaderActionProps = {
  href: string
  label: string
  icon: typeof Heart
  count?: number
}

function HeaderAction({ href, label, icon: Icon, count }: HeaderActionProps) {
  const safeCount =
    Number.isFinite(Number(count)) && Number(count) > 0
      ? Math.floor(Number(count))
      : 0

  return (
    <Link
      href={href}
      aria-label={
        safeCount > 0
          ? `${label}, ${safeCount} item${safeCount === 1 ? "" : "s"}`
          : label
      }
      className="relative grid size-11.5 cursor-pointer place-items-center rounded-xl border border-[#D5D7DA] transition hover:bg-black/2"
    >
      <Icon aria-hidden className="size-5" />

      {safeCount > 0 && (
        <span className="bg-primary absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[9px] leading-4 font-bold text-white">
          {safeCount > 99 ? "99+" : safeCount}
        </span>
      )}
    </Link>
  )
}
