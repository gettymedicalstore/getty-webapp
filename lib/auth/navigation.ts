const authPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-otp",
  "/verify-email",
  "/reset-password",
  "/change-password",
]

/** Only return to an application page; exclude auth loops and API endpoints. */
export function safeReturnPath(value?: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return null
  try {
    const url = new URL(value, "https://getty.invalid")
    let pathname = url.pathname
    for (let i = 0; i < 2; i++) pathname = decodeURIComponent(pathname)
    if (
      url.origin !== "https://getty.invalid" ||
      pathname.startsWith("//") ||
      /[\\\u0000-\u0020\u007f]/.test(pathname)
    )
      return null
    const normalized =
      new URL(pathname, "https://getty.invalid").pathname.replace(/\/+$/, "") ||
      "/"
    if (
      [...authPaths, "/api"].some(
        (p) => normalized === p || normalized.startsWith(`${p}/`)
      )
    )
      return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function authHref(path: string, returnTo?: string | null) {
  const destination = safeReturnPath(returnTo)
  return destination
    ? `${path}?${new URLSearchParams({ redirect: destination })}`
    : path
}
export function reauthenticationHref(returnTo?: string | null) {
  const query = new URLSearchParams({ reauthenticate: "1" })
  const destination = safeReturnPath(returnTo)
  if (destination) query.set("redirect", destination)
  return `/login?${query}`
}

export function accountHome(role?: string) {
  return role === "admin"
    ? "/admin"
    : role === "supplier"
      ? "/supplier"
      : "/customer"
}

export function accountRoleLabel(role?: string) {
  return role === "admin"
    ? "Administrator"
    : role === "supplier"
      ? "Vendor"
      : "Customer"
}

export function accountDashboardLabel(role?: string) {
  return role === "admin" ? "Admin dashboard" : "Orders"
}

/** Keep deep links in the user's workspace and let customers resume shopping. */
export function postLoginPath(role: string, returnTo?: unknown) {
  const home = accountHome(role)
  const destination = safeReturnPath(returnTo)
  if (!destination) return home
  let pathname = new URL(destination, "https://getty.invalid").pathname
  for (let i = 0; i < 2; i++) pathname = decodeURIComponent(pathname)
  pathname = new URL(pathname, "https://getty.invalid").pathname
  if (pathname === home || pathname.startsWith(`${home}/`)) return destination
  if (
    ["/admin", "/supplier", "/customer"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  )
    return home
  return role === "customer" ? destination : home
}

export function checkoutHref(frequency?: string, installments?: string) {
  const query = new URLSearchParams()
  if ([4, 6, 8, 10, 12, 14].includes(Number(installments))) {
    query.set("frequency", frequency === "monthly" ? "monthly" : "weekly")
    query.set("installments", String(Number(installments)))
  }
  return `/checkout${query.size ? `?${query}` : ""}`
}
