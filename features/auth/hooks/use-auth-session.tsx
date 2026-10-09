"use client"
import { useSyncExternalStore } from "react"
import {
  readSession,
  serverSession,
  subscribeSession,
} from "../api/session-store"
import type { AuthSession } from "../types/session"
export type { AuthSession } from "../types/session"
export const authSessionQueryKey = ["auth", "session"] as const
export function useAuthSession() {
  const session = useSyncExternalStore(
    subscribeSession,
    readSession,
    serverSession
  )
  return {
    data: session.ready ? ({ user: session.user } as AuthSession) : undefined,
    needsReauthentication: Boolean(session.user && session.refreshRejected),
    isPending: !session.ready,
    isLoading: !session.ready,
    isFetching: false,
    isSuccess: session.ready,
    isError: false,
    error: null as Error | null,
    refetch: async () => ({
      data: { user: readSession().user },
      isError: false,
      error: null as Error | null,
    }),
  }
}
