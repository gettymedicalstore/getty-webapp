"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import LoginDialog from "./login-dialog"

type LoginSuccessHandler = () => void | Promise<void>

type OpenLoginOptions = {
  onSuccess?: LoginSuccessHandler
}

type AuthDialogContextValue = {
  openLogin: (options?: OpenLoginOptions) => void
  closeLogin: () => void
  isLoginOpen: boolean
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null)

export default function AuthDialogProvider({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)

  const successHandlerRef = useRef<LoginSuccessHandler | null>(null)

  const openLogin = useCallback((options?: OpenLoginOptions) => {
    successHandlerRef.current = options?.onSuccess ?? null

    setOpen(true)
  }, [])

  const closeLogin = useCallback(() => {
    setOpen(false)
    successHandlerRef.current = null
  }, [])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      successHandlerRef.current = null
    }
  }, [])

  const handleLoginSuccess = useCallback(async () => {
    const successHandler = successHandlerRef.current

    setOpen(false)
    successHandlerRef.current = null

    await queryClient.invalidateQueries({
      queryKey: ["auth", "session"],
    })

    router.refresh()

    await successHandler?.()
  }, [queryClient, router])

  return (
    <AuthDialogContext.Provider
      value={{
        openLogin,
        closeLogin,
        isLoginOpen: open,
      }}
    >
      {children}

      <LoginDialog
        open={open}
        onOpenChange={handleOpenChange}
        onSuccess={handleLoginSuccess}
      />
    </AuthDialogContext.Provider>
  )
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext)

  if (!context) {
    throw new Error("useAuthDialog must be used inside AuthDialogProvider")
  }

  return context
}
