"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import type { MockUser } from "@/features/auth/server/mock-session"
import { Role } from "@/lib/auth/roles"

import AuthDialog from "./auth-dialog"

export type AuthDialogView = "login" | "forgot-password"

type LoginSuccessHandler = () => void | Promise<void>

type OpenLoginOptions = {
  onSuccess?: LoginSuccessHandler
}

type AuthDialogContextValue = {
  openLogin: (options?: OpenLoginOptions) => void
  openForgotPassword: () => void
  showLogin: () => void
  closeAuthDialog: () => void
  isAuthDialogOpen: boolean
  currentView: AuthDialogView
}

type SessionResponse = {
  user: MockUser | null
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
  const [view, setView] = useState<AuthDialogView>("login")

  const successHandlerRef = useRef<LoginSuccessHandler | null>(null)

  const openLogin = useCallback((options?: OpenLoginOptions) => {
    successHandlerRef.current = options?.onSuccess ?? null

    setView("login")
    setOpen(true)
  }, [])

  const openForgotPassword = useCallback(() => {
    setView("forgot-password")
    setOpen(true)
  }, [])

  const showLogin = useCallback(() => {
    setView("login")
  }, [])

  const closeAuthDialog = useCallback(() => {
    setOpen(false)
    setView("login")
    successHandlerRef.current = null
  }, [])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setView("login")
      successHandlerRef.current = null
    }
  }, [])

  const handleLoginSuccess = useCallback(async () => {
    const customSuccessHandler = successHandlerRef.current

    try {
      /*
       * Read the newly-created HTTP-only session cookie.
       */
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Your session could not be loaded after login.")
      }

      const session = (await response.json()) as SessionResponse

      if (!session.user) {
        throw new Error("Your session could not be loaded after login.")
      }

      await queryClient.invalidateQueries({
        queryKey: ["auth", "session"],
      })

      setOpen(false)
      setView("login")
      successHandlerRef.current = null

      /*
       * Checkout and other protected actions may provide their own
       * continuation callback. In that case, do not redirect away.
       */
      if (customSuccessHandler) {
        await customSuccessHandler()
        router.refresh()
        return
      }

      const destination =
        session.user.role === Role.ADMIN ? "/admin" : "/customer"

      router.replace(destination)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Your session could not be loaded after login."
      )
    }
  }, [queryClient, router])

  const contextValue = useMemo<AuthDialogContextValue>(
    () => ({
      openLogin,
      openForgotPassword,
      showLogin,
      closeAuthDialog,
      isAuthDialogOpen: open,
      currentView: view,
    }),
    [openLogin, openForgotPassword, showLogin, closeAuthDialog, open, view]
  )

  return (
    <AuthDialogContext.Provider value={contextValue}>
      {children}

      <AuthDialog
        open={open}
        view={view}
        onOpenChange={handleOpenChange}
        onLoginSuccess={handleLoginSuccess}
        onShowLogin={showLogin}
        onShowForgotPassword={openForgotPassword}
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
