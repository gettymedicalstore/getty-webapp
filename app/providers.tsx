"use client"

import AuthDialogProvider from "@/features/auth/components/auth-dialog-provider"
import {
  environmentManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import type { ReactNode } from "react"
import { Toaster } from "sonner"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
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
      <AuthDialogProvider>{children}</AuthDialogProvider>

      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
