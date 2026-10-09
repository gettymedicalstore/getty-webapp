"use client"
import {
  ValidatedForm,
  FormInput,
} from "@/components/shared/form/validated-form"
import { searchSchema } from "@/lib/form-schemas"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Menu,
  Search,
  ArrowUpRight,
  LifeBuoy,
  ChevronRight,
  Store,
  X,
} from "lucide-react"
import WorkspaceNavigation from "./workspace-navigation"
import {
  workspacePageTitle,
  type WorkspaceRole,
} from "@/lib/navigation/workspace-menu"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import UserMenu from "@/components/admin/layout/admin-user-menu"
import SessionNotice from "@/features/auth/components/session-notice"
import { getManagedProduct } from "@/features/admin/api/product-management"
import AppLogo from "./app-logo"
import { portalTenant } from "@/features/admin/api/portal"

export default function PortalShell({
  children,
  role = "admin",
}: {
  children: ReactNode
  role?: WorkspaceRole
}) {
  const path = usePathname()
  const router = useRouter()
  const base = `/${role}`
  const roleLabel =
    role === "admin"
      ? "Admin workspace"
      : role === "supplier"
        ? "Vendor workspace"
        : "Customer account"
  const [open, setOpen] = useState(false)
  const productDetail =
    (role === "admin" || role === "supplier") &&
    /^\/(admin|supplier)\/products\/[^/]+$/.test(path)
  const productId = productDetail ? (path.split("/").at(-1) ?? "") : ""
  const productQuery = useQuery({
    queryKey: ["managed-product", productId],
    queryFn: () => getManagedProduct(productId),
    enabled: productDetail,
  })
  const tenantRoute =
    role === "admin"
      ? path.match(/^\/admin\/(customers|vendors)\/([^/]+)$/)
      : null
  const tenantId = tenantRoute?.[2] ?? ""
  const tenantQuery = useQuery({
    queryKey: ["managed-tenant", tenantId],
    queryFn: () => portalTenant(tenantId),
    enabled: Boolean(tenantRoute),
  })
  const tenantName =
    typeof tenantQuery.data?.name === "string" ? tenantQuery.data.name : null
  const title = productDetail
    ? (productQuery.data?.product.name ?? "Product details")
    : tenantRoute
      ? (tenantName ??
        (tenantRoute[1] === "customers"
          ? "Customer details"
          : "Vendor details"))
      : path.endsWith("registration")
        ? "Complete registration"
        : workspacePageTitle(role, path)
  const parentHref = productDetail
    ? `${base}/products`
    : tenantRoute
      ? `/admin/${tenantRoute[1]}`
      : null
  const parentLabel = productDetail
    ? "Products"
    : tenantRoute?.[1] === "customers"
      ? "Customers"
      : "Vendors"
  const searchAction = role === "customer" ? "/products" : `${base}/products`
  const brand = (
    <Link
      href={base}
      className="flex min-h-12 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#9ed6bf]"
      aria-label="Getty Medical workspace home"
    >
      <AppLogo tone="inverse" className="h-auto w-full max-w-[216px]" />
    </Link>
  )
  const navigation = (
    <WorkspaceNavigation
      role={role}
      appearance="dark"
      onNavigate={() => setOpen(false)}
    />
  )
  const support = (
    <div className="space-y-1 border-t border-white/10 pt-4">
      <Link
        href="/contact"
        onClick={() => setOpen(false)}
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#aecbbd] transition-colors outline-none hover:bg-[#104f3c] hover:text-white focus-visible:ring-2 focus-visible:ring-[#9ed6bf] focus-visible:ring-inset"
      >
        <LifeBuoy aria-hidden className="size-[18px]" />
        Help & support
        <ArrowUpRight aria-hidden className="ml-auto size-3.5" />
      </Link>
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#aecbbd] transition-colors outline-none hover:bg-[#104f3c] hover:text-white focus-visible:ring-2 focus-visible:ring-[#9ed6bf] focus-visible:ring-inset"
      >
        <Store aria-hidden className="size-[18px]" />
        Visit storefront
        <ArrowUpRight aria-hidden className="ml-auto size-3.5" />
      </Link>
    </div>
  )
  return (
    <div className="min-h-dvh bg-[#f6f7f8] text-[#27332c]">
      <aside className="fixed inset-y-0 z-40 hidden w-64 flex-col border-r border-[#164f3e] bg-[#073e30] px-4 text-white [color-scheme:dark] lg:flex">
        <div className="px-2 py-6">{brand}</div>

        <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:#376753_transparent] overflow-y-auto pb-6">
          {navigation}
        </div>
        <div className="shrink-0 pb-5">{support}</div>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-[84px] items-center gap-3 border-b border-[#e7ebe8] bg-white px-4 py-3 sm:gap-5 sm:px-7 lg:px-9">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#e4e9e5] hover:bg-[#f5f7f5] lg:hidden"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-6 font-semibold text-[#243c2e] sm:text-lg">
              {title}
            </p>
            <nav aria-label="Breadcrumb" className="mt-0.5 min-w-0">
              <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-[#5e6f63] sm:gap-2">
                <li className="shrink-0">
                  <Link
                    href={base}
                    className="hover:text-primary focus-visible:underline"
                  >
                    {roleLabel}
                  </Link>
                </li>
                {parentHref && (
                  <>
                    <li aria-hidden className="shrink-0 text-[#a7afa9]">
                      <ChevronRight className="size-3.5" />
                    </li>
                    <li className="shrink-0">
                      <Link
                        href={parentHref}
                        className="hover:text-primary focus-visible:underline"
                      >
                        {parentLabel}
                      </Link>
                    </li>
                  </>
                )}
                <li aria-hidden className="shrink-0 text-[#a7afa9]">
                  <ChevronRight className="size-3.5" />
                </li>
                <li
                  aria-current="page"
                  className="truncate font-medium text-[#334439]"
                >
                  {title}
                </li>
              </ol>
            </nav>
          </div>
          <ValidatedForm
            schema={searchSchema}
            onSubmit={({ search }) => {
              router.push(`${searchAction}?${new URLSearchParams({ search })}`)
              setOpen(false)
            }}
            role="search"
            className="relative hidden w-full max-w-64 shrink-0 xl:block"
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-[#828c85]"
            />
            <FormInput
              name="search"
              type="search"
              aria-label="Search products"
              placeholder="Search products…"
              className="h-11 rounded-lg border-[#e5e9e6] bg-[#f9faf9] pl-10 text-sm shadow-none"
            />
          </ValidatedForm>
          <div className="ml-auto shrink-0 md:ml-0 md:border-l md:border-[#e8ece9] md:pl-4">
            <UserMenu />
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1440px] min-w-0 px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9"
        >
          <SessionNotice placement="workspace" />
          {children}
        </main>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-dvh max-h-dvh w-[min(320px,90vw)] max-w-none translate-x-0 translate-y-0 [scrollbar-width:thin] [scrollbar-color:#376753_transparent] flex-col gap-0 overflow-y-auto rounded-none border-y-0 border-r border-l-0 border-[#164f3e] bg-[#073e30] p-5 text-white [color-scheme:dark] ring-0 sm:max-w-none sm:p-5"
        >
          <DialogTitle className="sr-only">{roleLabel}</DialogTitle>
          <DialogDescription className="sr-only">
            Navigate your Getty Medical Stores account.
          </DialogDescription>
          <DialogClose
            aria-label="Close navigation"
            className="absolute top-2 right-2 grid size-11 place-items-center rounded-lg text-[#c3d8cf] transition-colors outline-none hover:bg-[#104f3c] hover:text-white focus-visible:ring-2 focus-visible:ring-[#9ed6bf] focus-visible:ring-inset"
          >
            <X aria-hidden className="size-5" />
          </DialogClose>
          <div className="mt-7 mb-7 pr-5">{brand}</div>
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[.13em] text-[#aecbbd] uppercase">
            {roleLabel}
          </p>
          <div className="flex-1 pb-7">{navigation}</div>
          <ValidatedForm
            schema={searchSchema}
            onSubmit={({ search }) => {
              router.push(`${searchAction}?${new URLSearchParams({ search })}`)
              setOpen(false)
            }}
            role="search"
            className="mb-5"
          >
            <FormInput
              name="search"
              type="search"
              aria-label="Search products"
              placeholder="Search products…"
              className="h-12 rounded-lg border-[#376753] bg-[#104a39] text-base text-white shadow-none placeholder:text-[#b4ccbf] focus-visible:border-[#9ed6bf] focus-visible:ring-[#9ed6bf]/30"
            />
          </ValidatedForm>
          {support}
        </DialogContent>
      </Dialog>
    </div>
  )
}
