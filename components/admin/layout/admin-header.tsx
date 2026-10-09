"use client"
import {
  ValidatedForm,
  FormInput,
} from "@/components/shared/form/validated-form"
import { searchSchema } from "@/lib/form-schemas"
import { useRouter } from "next/navigation"

import { Menu, Search } from "lucide-react"
import { useState } from "react"

import AdminMobileSidebar from "./admin-mobile-sidebar"
import AdminUserMenu from "./admin-user-menu"

export default function AdminHeader() {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="bg-background/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid size-10 place-items-center rounded-md border lg:hidden"
          aria-label="Open admin navigation"
        >
          <Menu className="size-5" />
        </button>

        <ValidatedForm
          schema={searchSchema}
          onSubmit={({ search }) =>
            router.push(`/products?${new URLSearchParams({ search })}`)
          }
          className="relative hidden max-w-md flex-1 md:block"
        >
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

          <FormInput
            type="search"
            name="search"
            aria-label="Search products"
            placeholder="Search products..."
            className="bg-background focus:border-primary h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none"
          />
        </ValidatedForm>

        <div className="ml-auto flex items-center gap-2">
          <AdminUserMenu />
        </div>
      </header>

      <AdminMobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  )
}
