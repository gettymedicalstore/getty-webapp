import { cache } from "react"
import { redirect } from "next/navigation"

import { auth } from "./auth"

export const getCurrentSession = cache(async () => {
  return auth()
})

export const getSession = getCurrentSession

export async function getCurrentUser() {
  const session = await getCurrentSession()

  return session?.user ?? null
}

export async function requireSession(callbackUrl?: string) {
  const session = await getCurrentSession()

  if (!session?.user) {
    const loginUrl = new URL(
      "/login",
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    )

    if (callbackUrl) {
      loginUrl.searchParams.set("callbackUrl", callbackUrl)
    }

    redirect(`${loginUrl.pathname}${loginUrl.search}`)
  }

  return session
}

export async function requireUser(callbackUrl?: string) {
  const session = await requireSession(callbackUrl)

  return session.user
}
