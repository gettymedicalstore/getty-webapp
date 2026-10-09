"use client"

import {
  environmentManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import type { ReactNode } from "react"
import { Toaster } from "sonner"
import SessionCacheSync from "@/features/auth/components/session-cache-sync"
import SessionNotice from "@/features/auth/components/session-notice"
import { GettyApiError } from "@/lib/api/errors"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (
            error instanceof GettyApiError &&
            error.status >= 400 &&
            error.status < 500
          )
            return false
          return failureCount < 1
        },
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (environmentManager.isServer()) {
    return createQueryClient()
  }

  browserQueryClient ??= createQueryClient()

  return browserQueryClient
}

export default function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <SessionCacheSync />
      <SessionNotice />
      {children}

      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
