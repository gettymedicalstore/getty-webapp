import { cookies } from "next/headers"

import {
  decodeMockSession,
  MOCK_SESSION_COOKIE,
  type MockUser,
} from "@/features/auth/server/mock-session"

export type AuthSession = {
  user: MockUser
}

/**
 * Reads the current mock authentication session from the HTTP-only cookie.
 *
 * Replace this implementation when your real backend authentication
 * service is available.
 */
export async function auth(): Promise<AuthSession | null> {
  const cookieStore = await cookies()

  const user = decodeMockSession(cookieStore.get(MOCK_SESSION_COOKIE)?.value)

  if (!user) {
    return null
  }

  return {
    user,
  }
}
