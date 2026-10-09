"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthSession } from "../hooks/use-auth-session"
import { reauthenticationHref } from "@/lib/auth/navigation"
import { CircleAlert, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const authPages = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-otp",
])

export default function SessionNotice({
  placement = "global",
}: {
  placement?: "global" | "workspace"
}) {
  const { needsReauthentication } = useAuthSession()
  const pathname = usePathname()
  const inWorkspace = /^\/(admin|supplier|customer)(\/|$)/.test(pathname)
  if (
    !needsReauthentication ||
    authPages.has(pathname) ||
    (placement === "global" && inWorkspace)
  )
    return null
  return (
    <div
      role="status"
      className={cn(
        "border-[#eadbc0] bg-[#fffbf1] px-4 py-3 text-[13px] text-[#755525]",
        placement === "workspace" ? "mb-7 rounded-lg border" : "border-b"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-5",
          placement === "global" && "site-container"
        )}
      >
        <div className="flex items-start gap-2.5">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="leading-5">
            Sign in again to reconnect your account and access the latest
            updates.
          </p>
        </div>
        <Link
          href={reauthenticationHref(pathname)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-[#eadbc0] bg-white px-3 font-semibold hover:bg-[#fff5df] sm:-my-1"
        >
          Sign in again
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
