"use client"

import { useQuery } from "@tanstack/react-query"

export const authSessionQueryKey = ["auth", "session"] as const

export type AuthUser = {
  id: string
  email: string
  name: string
}

export type AuthSession = {
  user: AuthUser | null
}

async function getAuthSession(): Promise<AuthSession> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  })

  const result = (await response.json()) as AuthSession & {
    message?: string
  }

  if (!response.ok) {
    throw new Error(result.message ?? "Unable to load the current session.")
  }

  return {
    user: result.user ?? null,
  }
}

export function useAuthSession() {
  return useQuery({
    queryKey: authSessionQueryKey,
    queryFn: getAuthSession,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
