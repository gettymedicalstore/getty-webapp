import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  decodeMockSession,
  MOCK_SESSION_COOKIE,
} from "@/features/auth/server/mock-session"

const protectedRoutes = ["/customer"]
const adminRoutes = ["/admin"]

const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const sessionValue = request.cookies.get(MOCK_SESSION_COOKIE)?.value

  const user = decodeMockSession(sessionValue)
  const role = request.cookies.get("user-role")?.value

  const isAuthenticated = user !== null

  const isProtectedRoute = matchesRoute(pathname, protectedRoutes)

  const isAdminRoute = matchesRoute(pathname, adminRoutes)

  const isAuthRoute = matchesRoute(pathname, authRoutes)

  if (!isAuthenticated && (isProtectedRoute || isAdminRoute)) {
    const loginUrl = new URL("/login", request.url)

    loginUrl.searchParams.set("redirect", `${pathname}${search}`)

    const response = NextResponse.redirect(loginUrl)

    if (sessionValue) {
      response.cookies.delete(MOCK_SESSION_COOKIE)
    }

    return response
  }

  if (isAuthenticated && isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/customer", request.url))
  }

  if (isAuthenticated && isAuthRoute) {
    const requestedRedirect = request.nextUrl.searchParams.get("redirect")

    const safeRedirect = getSafeRedirect(requestedRedirect)

    const destination =
      safeRedirect ?? (role === "admin" ? "/admin" : "/customer")

    return NextResponse.redirect(new URL(destination, request.url))
  }

  return NextResponse.next()
}

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  return value
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/customer/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
}
