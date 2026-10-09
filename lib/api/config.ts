export const GETTY_API_BASE_URL = (
  process.env.NEXT_PUBLIC_GETTY_API_BASE_URL?.trim() ||
  "https://api.gettymedicalstores.com"
).replace(/\/+$/, "")

export function gettyUrl(path: string) {
  if (!path.startsWith("/getty/") && !path.startsWith("/auth/getty/"))
    throw new Error("Use a documented Getty API endpoint.")
  const url = new URL(path, `${GETTY_API_BASE_URL}/`)
  if (url.origin !== new URL(GETTY_API_BASE_URL).origin)
    throw new Error("Invalid Getty API origin.")
  if (
    url.protocol !== "https:" ||
    (!url.pathname.startsWith("/getty/") &&
      !url.pathname.startsWith("/auth/getty/"))
  )
    throw new Error("Invalid Getty API endpoint.")
  return url.href
}
