import { redirect } from "next/navigation"

import { Role } from "./roles"
import { requireSession } from "./session"

export async function requireAuth(callbackUrl?: string) {
  return requireSession(callbackUrl)
}

export async function requireAdmin() {
  const session = await requireSession("/admin")

  if (session.user.role !== Role.ADMIN) {
    redirect("/customer")
  }

  return session
}

export async function requireCustomer() {
  const session = await requireSession("/customer")

  if (session.user.role !== Role.CUSTOMER) {
    redirect("/admin")
  }

  return session
}
