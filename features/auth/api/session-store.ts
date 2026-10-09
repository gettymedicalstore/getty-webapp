import { z } from "zod"
import { Role } from "@/lib/auth/roles"
import type { GettyUser } from "../types/session"
import type { SessionTokens } from "../schemas/token-schema"
import { GETTY_API_BASE_URL } from "@/lib/api/config"
import { backendRole } from "../server/backend-role"

export const SESSION_STORAGE_KEY = "getty-live-session-v2"
const legacyKey = "getty-live-session-v1"
const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  phone: z.string().optional(),
  role: z.enum([Role.ADMIN, Role.CUSTOMER, Role.SUPPLIER]),
  profileRole: z.string().optional(),
  tenantType: z.string().optional(),
  tenant: z.string().optional(),
  status: z.string().optional(),
  tenantStatus: z.string().optional(),
  resetPassword: z.boolean().optional(),
})
const recordSchema = z
  .object({
    origin: z.literal(GETTY_API_BASE_URL),
    sessionId: z.string().min(1).nullable(),
    user: userSchema.nullable(),
    accessToken: z.string().min(1).nullable(),
    refreshToken: z.string().min(1).nullable(),
    fingerprint: z.string().min(1).nullable(),
    authMode: z.enum(["bearer", "cookie"]).default("bearer"),
    credentialVersion: z.number().int().nonnegative().default(0),
    refreshRejected: z.boolean().default(false),
  })
  .refine((value) =>
    value.user
      ? Boolean(
          value.sessionId && (value.authMode === "cookie" || value.accessToken)
        )
      : !value.sessionId &&
        !value.accessToken &&
        !value.refreshToken &&
        !value.fingerprint &&
        !value.refreshRejected
  )
const legacySchema = z.object({
  origin: z.literal(GETTY_API_BASE_URL),
  accessToken: z.string().min(1),
  user: userSchema,
})

export type SessionSnapshot = {
  ready: boolean
  sessionId: string | null
  user: GettyUser | null
  accessToken: string | null
  refreshToken: string | null
  fingerprint: string | null
  authMode: "bearer" | "cookie"
  credentialVersion: number
  refreshRejected: boolean
}
const signedOut = {
  sessionId: null,
  user: null,
  accessToken: null,
  refreshToken: null,
  fingerprint: null,
  authMode: "bearer" as const,
  credentialVersion: 0,
  refreshRejected: false,
}
const serverSnapshot: SessionSnapshot = { ready: false, ...signedOut }
let snapshot = serverSnapshot
let memoryOnly = false
let observingStorage = false
const listeners = new Set<() => void>()

function readStorage(storage: "localStorage" | "sessionStorage", key: string) {
  try {
    return { available: true, value: window[storage].getItem(key) }
  } catch {
    return { available: false, value: null }
  }
}
function removeTabCopies() {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    window.sessionStorage.removeItem(legacyKey)
  } catch {
    /* Storage may be blocked; the in-memory session still works. */
  }
}
function persist() {
  const { ready, ...session } = snapshot
  void ready
  const value = JSON.stringify({ origin: GETTY_API_BASE_URL, ...session })
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, value)
    memoryOnly = false
    removeTabCopies()
    return
  } catch {
    // Keep this login usable when browser persistence is blocked.
    memoryOnly = true
  }
}
function decode(value: string | null): SessionSnapshot | null {
  try {
    const parsed = recordSchema.safeParse(JSON.parse(value ?? "null"))
    if (!parsed.success) return null
    const { origin, user, ...session } = parsed.data
    void origin
    return {
      ready: true,
      ...session,
      user: user
        ? {
            ...user,
            role:
              user.tenantType && user.profileRole
                ? backendRole(user.tenantType, user.profileRole)
                : user.role,
          }
        : null,
    }
  } catch {
    return null
  }
}
function storedSession(migrate: boolean): SessionSnapshot | undefined {
  const local = readStorage("localStorage", SESSION_STORAGE_KEY)
  const value = local.value
  if (value !== null) return decode(value) ?? { ready: true, ...signedOut }
  if (migrate) {
    try {
      const old = legacySchema.safeParse(
        JSON.parse(readStorage("sessionStorage", legacyKey).value ?? "null")
      )
      if (old.success) {
        const user = old.data.user
        return {
          ready: true,
          sessionId: crypto.randomUUID(),
          user: {
            ...user,
            role:
              user.tenantType && user.profileRole
                ? backendRole(user.tenantType, user.profileRole)
                : user.role,
          },
          accessToken: old.data.accessToken,
          refreshToken: null,
          fingerprint: null,
          authMode: "bearer",
          credentialVersion: 0,
          refreshRejected: false,
        }
      }
    } catch {
      /* Invalid or absent legacy data is not a session. */
    }
  }
  return local.available ? { ready: true, ...signedOut } : undefined
}
function emit() {
  listeners.forEach((listener) => listener())
}

export function syncSession(): SessionSnapshot {
  if (typeof window === "undefined") return serverSnapshot
  if (!snapshot.ready) return readSession()
  if (memoryOnly) return snapshot
  const next = storedSession(false)
  if (
    next &&
    (next.sessionId !== snapshot.sessionId ||
      next.accessToken !== snapshot.accessToken ||
      next.refreshToken !== snapshot.refreshToken ||
      next.fingerprint !== snapshot.fingerprint ||
      next.authMode !== snapshot.authMode ||
      next.credentialVersion !== snapshot.credentialVersion ||
      next.refreshRejected !== snapshot.refreshRejected)
  ) {
    snapshot = next
    emit()
  }
  return snapshot
}
export function readSession(): SessionSnapshot {
  if (typeof window === "undefined") return serverSnapshot
  if (!observingStorage) {
    window.addEventListener("storage", (event) => {
      if (
        event.storageArea === window.localStorage &&
        (event.key === SESSION_STORAGE_KEY || event.key === null)
      ) {
        memoryOnly = false
        removeTabCopies()
        syncSession()
      }
    })
    observingStorage = true
  }
  if (!snapshot.ready) {
    const needsMigration =
      readStorage("localStorage", SESSION_STORAGE_KEY).value === null
    snapshot = storedSession(true) ?? { ready: true, ...signedOut }
    // Migrate without interpreting encrypted access tokens as ordinary JWTs.
    if (snapshot.user && needsMigration) persist()
  }
  return snapshot
}
export const serverSession = () => serverSnapshot
export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function saveSession(user: GettyUser, tokens: SessionTokens | string) {
  const pair = typeof tokens === "string" ? { accessToken: tokens } : tokens
  snapshot = {
    ready: true,
    sessionId: crypto.randomUUID(),
    user,
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken ?? null,
    fingerprint: pair.fingerprint ?? null,
    authMode: "bearer",
    credentialVersion: 0,
    refreshRejected: false,
  }
  persist()
  emit()
}
/** Only replace credentials while the login that requested them is current. */
export function updateSessionTokens(
  expected: SessionSnapshot,
  tokens?: SessionTokens
): boolean {
  syncSession()
  if (
    !snapshot.user ||
    snapshot.sessionId !== expected.sessionId ||
    credentialsChanged(expected, snapshot)
  )
    return false
  snapshot = {
    ...snapshot,
    // Cookie-only renewal must not replay an expired Authorization header.
    accessToken: tokens?.accessToken ?? null,
    refreshToken: tokens?.refreshToken ?? snapshot.refreshToken,
    fingerprint: tokens?.fingerprint ?? snapshot.fingerprint,
    authMode: tokens ? "bearer" : "cookie",
    credentialVersion: snapshot.credentialVersion + 1,
    refreshRejected: false,
  }
  persist()
  emit()
  return true
}
/** A rejected renewal is actionable without discarding the saved account. */
export function markRefreshRejected(expected: SessionSnapshot): boolean {
  syncSession()
  if (
    !snapshot.user ||
    snapshot.sessionId !== expected.sessionId ||
    credentialsChanged(expected, snapshot)
  )
    return false
  snapshot = { ...snapshot, refreshRejected: true }
  persist()
  emit()
  return true
}
export function clearSession(expected?: SessionSnapshot): boolean {
  if (expected) {
    syncSession()
    if (
      snapshot.sessionId !== expected.sessionId ||
      credentialsChanged(expected, snapshot)
    )
      return false
  }
  snapshot = { ready: true, ...signedOut }
  // A credential-free marker prevents old tabs resurrecting legacy sessions.
  persist()
  emit()
  return true
}
export function accessToken() {
  return readSession().accessToken
}

export function credentialsChanged(
  expected: SessionSnapshot,
  current: SessionSnapshot
) {
  return (
    expected.accessToken !== current.accessToken ||
    expected.refreshToken !== current.refreshToken ||
    expected.authMode !== current.authMode ||
    expected.credentialVersion !== current.credentialVersion
  )
}
