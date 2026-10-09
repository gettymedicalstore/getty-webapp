import { z } from "zod"
import { GettyApiError } from "@/lib/api/errors"
import { GETTY_API_BASE_URL } from "@/lib/api/config"
import { sendGettyRequest, unwrapGettyResponse } from "@/lib/api/transport"
import { SessionTokensSchema } from "../schemas/token-schema"
import {
  markRefreshRejected,
  syncSession,
  updateSessionTokens,
  credentialsChanged,
  type SessionSnapshot,
} from "./session-store"

const refreshResponse = z.object({
  success: z.literal(true).optional(),
  tokens: SessionTokensSchema.optional(),
})
const pending = new Map<string, Promise<SessionSnapshot>>()
const rejectedRefresh = () =>
  new GettyApiError(
    "We couldn’t renew your session. Please sign in again to restore account access.",
    401
  )

/** A request from an earlier account must never run as the current account. */
export function currentSession(expected: SessionSnapshot): SessionSnapshot {
  const current = syncSession()
  if (
    !current.user ||
    !current.sessionId ||
    current.sessionId !== expected.sessionId
  )
    throw new GettyApiError("Your account has changed. Please try again.", 409)
  return current
}

async function renew(expected: SessionSnapshot): Promise<SessionSnapshot> {
  const session = currentSession(expected)
  // Another request or browser tab may already have renewed this login.
  if (credentialsChanged(expected, session)) return session
  if (session.refreshRejected) throw rejectedRefresh()
  // The backend authenticates renewal using its cookies, including HttpOnly
  // cookies that browser JavaScript cannot read. Follow the supplied adapter.
  const result = await sendGettyRequest("/auth/getty/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  })

  const latest = currentSession(session)
  if (credentialsChanged(session, latest)) return latest

  // A rejection must not erase a login or cause a redirect loop. Remember it so
  // subsequent queries and other tabs do not repeat the same failing renewal.
  if (result.status === 401 || result.status === 403) {
    markRefreshRejected(session)
    throw rejectedRefresh()
  }
  const body =
    result.emptyBody && result.status >= 200 && result.status < 300
      ? {}
      : unwrapGettyResponse(result)
  const parsed = refreshResponse.safeParse(body)
  if (!parsed.success)
    throw new GettyApiError(
      "The Getty service returned an incomplete refresh response."
    )
  if (!updateSessionTokens(session, parsed.data.tokens))
    return currentSession(session)
  return currentSession(session)
}

/** Share renewal within a tab, and across tabs where Web Locks are available. */
export function refreshSession(
  expected: SessionSnapshot
): Promise<SessionSnapshot> {
  const current = currentSession(expected)
  if (credentialsChanged(expected, current)) return Promise.resolve(current)
  const sessionId = current.sessionId!
  const existing = pending.get(sessionId)
  if (existing) return existing

  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined
  const renewal = Promise.resolve(
    locks
      ? locks.request(`getty-session-refresh:${GETTY_API_BASE_URL}`, () =>
          renew(expected)
        )
      : renew(expected)
  )
  const shared = renewal.finally(() => {
    if (pending.get(sessionId) === shared) pending.delete(sessionId)
  })
  pending.set(sessionId, shared)
  return shared
}

/** Cancel a waiting request without cancelling renewal needed by other callers. */
export function waitForRefresh(
  renewal: Promise<SessionSnapshot>,
  signal?: AbortSignal | null
): Promise<SessionSnapshot> {
  if (!signal) return renewal
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason)
    renewal.then(
      (value) => {
        signal.removeEventListener("abort", abort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener("abort", abort)
        reject(error)
      }
    )
    if (signal.aborted) abort()
    else signal.addEventListener("abort", abort, { once: true })
  })
}
