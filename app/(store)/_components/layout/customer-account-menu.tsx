"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { MockUser } from "@/features/auth/server/mock-session"
import { Role } from "@/lib/auth/roles"

type CustomerAccountMenuProps = {
  user: MockUser
}

export default function CustomerAccountMenu({
  user,
}: CustomerAccountMenuProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  const dashboardHref = user.role === Role.ADMIN ? "/admin" : "/customer"

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    try {
      setIsLoggingOut(true)

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Unable to log out.")
      }

      queryClient.setQueryData(["auth", "session"], {
        user: null,
      })

      await queryClient.invalidateQueries({
        queryKey: ["auth", "session"],
      })

      setOpen(false)
      toast.success("You have been logged out.")

      router.replace("/")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log out.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-black/3"
      >
        <UserAvatar user={user} />

        <span className="hidden min-w-0 lg:block">
          <span className="block max-w-32 truncate text-sm font-semibold text-[#252B37]">
            {user.name}
          </span>

          <span className="block max-w-40 truncate text-xs text-[#717680]">
            {user.email}
          </span>
        </span>

        <ChevronDown
          aria-hidden
          className={`hidden size-4 text-[#535862] transition-transform lg:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+0.75rem)] right-0 z-70 w-64 overflow-hidden rounded-xl border border-[#E9EAEB] bg-white shadow-[0_20px_40px_-12px_rgba(10,13,18,0.22)]"
        >
          <div className="border-b border-[#E9EAEB] px-4 py-4">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#252B37]">
                  {user.name}
                </p>

                <p className="truncate text-xs text-[#717680]">{user.email}</p>
              </div>
            </div>
          </div>

          <nav className="p-2">
            <AccountMenuLink
              href={dashboardHref}
              label={user.role === Role.ADMIN ? "Admin Dashboard" : "Dashboard"}
              icon={user.role === Role.ADMIN ? ShieldCheck : LayoutDashboard}
              onNavigate={() => setOpen(false)}
            />

            {user.role === Role.CUSTOMER ? (
              <>
                <AccountMenuLink
                  href="/customer/orders"
                  label="My Orders"
                  icon={Package}
                  onNavigate={() => setOpen(false)}
                />

                <AccountMenuLink
                  href="/wishlist"
                  label="My Wishlist"
                  icon={Heart}
                  onNavigate={() => setOpen(false)}
                />

                <AccountMenuLink
                  href="/customer/profile"
                  label="Account Settings"
                  icon={Settings}
                  onNavigate={() => setOpen(false)}
                />
              </>
            ) : null}
          </nav>

          <div className="border-t border-[#E9EAEB] p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#B42318] transition hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut aria-hidden className="size-4" />

              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function UserAvatar({ user }: { user: MockUser }) {
  const initials = getInitials(user.name)

  return (
    <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#D7FFEE] text-sm font-bold text-[#027A48]">
      {initials}

      <span
        aria-label="Online"
        className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-[#12B76A]"
      />
    </span>
  )
}

type AccountMenuLinkProps = {
  href: string
  label: string
  icon: typeof UserRound
  onNavigate: () => void
}

function AccountMenuLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: AccountMenuLinkProps) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#414651] transition hover:bg-[#F5F5F5]"
    >
      <Icon aria-hidden className="size-4 text-[#717680]" />
      {label}
    </Link>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "U"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
