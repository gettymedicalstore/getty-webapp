"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { postLoginPath } from "@/lib/auth/navigation"
import { readSession } from "@/features/auth/api/session-store"
import LoginForm from "@/features/auth/components/login-form"
import { useQueryClient } from "@tanstack/react-query"
import {
  authSessionQueryKey,
  useAuthSession,
} from "@/features/auth/hooks/use-auth-session"
import { AuthFormSkeleton } from "@/components/shared/loading-skeletons"

type LoginPageFormProps = {
  redirectTo?: string
  reauthenticate?: boolean
}

export default function LoginPageForm({
  redirectTo,
  reauthenticate = false,
}: LoginPageFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const session = useAuthSession()
  const user = session.data?.user
  const canShowForm = reauthenticate || session.needsReauthentication

  useEffect(() => {
    if (user && !canShowForm) {
      router.replace(postLoginPath(user.role, redirectTo))
      router.refresh()
    }
  }, [user, canShowForm, redirectTo, router])

  async function handleSuccess() {
    const session = readSession()
    if (!session.user)
      throw new Error("Your session could not be loaded. Please try again.")
    queryClient.clear()
    queryClient.setQueryData(authSessionQueryKey, { user: session.user })
    if (reauthenticate) {
      router.replace(postLoginPath(session.user.role, redirectTo))
      router.refresh()
    }
  }

  if (session.isPending || (user && !canShowForm)) return <AuthFormSkeleton />

  return (
    <LoginForm
      onSuccess={handleSuccess}
      returnTo={redirectTo}
      className="p-0 sm:p-0"
    />
  )
}
