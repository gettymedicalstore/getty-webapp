"use client"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthSession } from "../hooks/use-auth-session"
import { accountHome, authHref } from "@/lib/auth/navigation"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
export default function AuthBoundary({
  children,
  roles,
}: {
  children: ReactNode
  roles?: string[]
}) {
  const session = useAuthSession(),
    router = useRouter(),
    user = session.data?.user
  const allowed = Boolean(user && (!roles || roles.includes(user.role)))
  useEffect(() => {
    if (session.isPending) return
    if (!user)
      router.replace(
        authHref(
          "/login",
          `${window.location.pathname}${window.location.search}`
        )
      )
    else if (!allowed) router.replace(accountHome(user.role))
  }, [session.isPending, user, allowed, router])
  return allowed ? (
    children
  ) : (
    <div className="site-container py-10">
      <DashboardSkeleton />
    </div>
  )
}
