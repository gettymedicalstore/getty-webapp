"use client"

import { useQueryClient } from "@tanstack/react-query"
import { BadgeCheck, ChevronDown, KeyRound, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

import type { GettyUser } from "@/features/auth/types/session"
import { logout } from "@/features/auth/api/auth"
import ChangePasswordDialog from "@/features/auth/components/change-password-dialog"
import { accountRoleLabel } from "@/lib/auth/navigation"
import { cn } from "@/lib/utils"

type CustomerAccountMenuProps = {
  user: GettyUser
  compactOnMobile?: boolean
}

export default function CustomerAccountMenu({
  user,
  compactOnMobile = false,
}: CustomerAccountMenuProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const roleLabel = accountRoleLabel(user.role)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        if (menuRef.current?.contains(document.activeElement))
          triggerRef.current?.focus()
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

      await logout().catch(() => {
        toast.info(
          "You are signed out on this device. The server could not confirm token revocation."
        )
      })
      queryClient.clear()
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
    <>
      <div
        ref={menuRef}
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={`${roleLabel} account for ${user.name}`}
          className={cn(
            "flex min-h-12 cursor-pointer items-center rounded-xl text-left transition hover:bg-black/3",
            compactOnMobile
              ? "size-12 justify-center p-1 lg:h-auto lg:w-auto lg:gap-3 lg:px-3 lg:py-1.5"
              : "gap-3 px-3 py-1.5"
          )}
        >
          <UserAvatar user={user} />

          <span className="hidden min-w-0 lg:block">
            <span
              className="block max-w-44 truncate text-[13px] font-semibold text-[#29382e]"
              title={user.name}
            >
              {user.name}
            </span>

            <span className="mt-0.5 block max-w-44 truncate text-[11px] text-[#68766d]">
              {roleLabel}
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
            id={menuId}
            role="region"
            aria-label={`${roleLabel} account`}
            className="absolute top-[calc(100%+0.75rem)] right-0 z-70 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#E9EAEB] bg-white shadow-[0_20px_40px_-12px_rgba(10,13,18,0.22)]"
          >
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} />

                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[#252B37]">
                    <span className="min-w-0 truncate">{user.name}</span>
                    {user.tenantStatus === "verified" && (
                      <span
                        role="img"
                        aria-label="Verified organisation"
                        title="Verified organisation"
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8f5ec] text-[#14834e]"
                      >
                        <BadgeCheck className="size-4" aria-hidden />
                      </span>
                    )}
                  </p>

                  <p className="truncate text-xs text-[#717680]">
                    {user.email}
                  </p>
                </div>
              </div>

              {user.tenant && (
                <p className="mt-2 text-xs break-words text-[#717680]">
                  {user.tenant}
                </p>
              )}
            </div>

            <div className="border-t border-[#E9EAEB] p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setPasswordOpen(true)
                }}
                aria-haspopup="dialog"
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-[#344e3b] transition hover:bg-[#f1f6f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008751]"
              >
                <KeyRound aria-hidden className="size-5" />
                Change password
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#B42318] transition hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut aria-hidden className="size-5" />

                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  )
}

function UserAvatar({ user }: { user: GettyUser }) {
  const initials = getInitials(user.name)

  return (
    <span className="relative grid size-10 shrink-0 place-items-center rounded-full border border-[#d9e7db] bg-[#edf4ea] text-[13px] font-semibold text-[#41644b]">
      {initials}

      {user.status === "active" && (
        <span
          aria-label="Active account"
          className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-[#12B76A]"
        />
      )}
    </span>
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
