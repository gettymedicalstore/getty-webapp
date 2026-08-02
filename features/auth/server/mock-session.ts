import { Role } from "@/lib/auth/roles"

export const MOCK_SESSION_COOKIE = "mock-session"

export type MockUser = {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
}

export function encodeMockSession(user: MockUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url")
}

export function decodeMockSession(value: string | undefined): MockUser | null {
  if (!value) {
    return null
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8")
    const parsed: unknown = JSON.parse(decoded)

    if (!isMockUser(parsed)) {
      return null
    }

    return parsed
  } catch (error) {
    console.error("Unable to decode mock session:", error)

    return null
  }
}

function isMockUser(value: unknown): value is MockUser {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const user = value as Partial<MockUser>

  return (
    typeof user.id === "string" &&
    user.id.trim().length > 0 &&
    typeof user.email === "string" &&
    user.email.trim().length > 0 &&
    typeof user.name === "string" &&
    user.name.trim().length > 0 &&
    (user.phone === undefined || typeof user.phone === "string") &&
    (user.role === Role.ADMIN || user.role === Role.CUSTOMER)
  )
}
