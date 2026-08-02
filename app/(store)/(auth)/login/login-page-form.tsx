"use client"

import { useRouter } from "next/navigation"

import LoginForm from "@/features/auth/components/login-form"

type LoginPageFormProps = {
  redirectTo?: string
}

export default function LoginPageForm({ redirectTo }: LoginPageFormProps) {
  const router = useRouter()

  async function handleSuccess() {
    router.replace(getSafeRedirect(redirectTo))
    router.refresh()
  }

  return (
    <LoginForm
      onSuccess={handleSuccess}
      className="px-6 py-8 sm:px-9 sm:py-10"
    />
  )
}

function getSafeRedirect(redirectTo?: string) {
  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//")
  ) {
    return "/"
  }

  return redirectTo
}
