import { cookies } from "next/headers"

export async function getSessionCookie() {
  return (await cookies()).get("session")
}

export async function deleteSessionCookie() {
  ;(await cookies()).delete("session")
}
