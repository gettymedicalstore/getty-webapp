"use client"

import Link from "next/link"
import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { AppLogoHead } from "@/components/shared/app-logo"
import { InputField } from "@/components/shared/form"
import { Google } from "@/components/svgs/socials"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/schemas/login-schema"
import { cn } from "@/lib/utils"

type LoginFormProps = {
  onSuccess?: () => void | Promise<void>
  className?: string
}

type LoginResponse = {
  message?: string
  user?: {
    id: string
    email: string
    name?: string
  }
}

type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>

export default function LoginForm({ onSuccess, className }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
    rememberMe: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})

  function updateField<K extends keyof LoginInput>(
    field: K,
    value: LoginInput[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))

    clearFieldError(field)
  }

  function clearFieldError(field: keyof LoginInput) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const nextErrors = { ...current }

      delete nextErrors[field]

      return nextErrors
    })
  }

  async function handleSubmit(
    event: SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const validation = loginSchema.safeParse(formData)

    if (!validation.success) {
      const errors = getFieldErrors(validation.error)

      setFieldErrors(errors)

      const firstError = errors.email ?? errors.password ?? errors.rememberMe

      if (firstError) {
        toast.error(firstError)
      }

      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      })

      const result = await parseLoginResponse(response)

      if (!response.ok) {
        throw new Error(result.message ?? getLoginErrorMessage(response.status))
      }

      if (!result.user?.email) {
        throw new Error(
          "Login succeeded, but the user information was not returned."
        )
      }

      toast.success(result.message ?? "Login successful.")

      await onSuccess?.()
    } catch (error) {
      console.error("Login failed:", error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to log in. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleLogin() {
    if (isSubmitting) {
      return
    }

    window.location.assign("/api/auth/google")
  }

  return (
    <div className={cn("w-full bg-white px-6 py-7 sm:px-8 sm:py-8", className)}>
      <div className="flex justify-center">
        <div className="origin-center scale-75">
          <AppLogoHead className="h-16 w-13" />
        </div>
      </div>

      <div className="mt-4 text-center">
        <h2 className="font-inter text-lg leading-7 font-semibold text-[#181D27]">
          Log in to your account
        </h2>

        <p className="mt-1 text-xs leading-5 text-[#717680]">
          Enter your email address and password to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <InputField
          id="login-email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(event) => updateField("email", event.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="Enter your email address"
          disabled={isSubmitting}
          error={fieldErrors.email}
          labelClassName="text-xs"
        />

        <InputField
          id="login-password"
          label="Password"
          type="password"
          value={formData.password}
          onChange={(event) => updateField("password", event.target.value)}
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={isSubmitting}
          error={fieldErrors.password}
          labelClassName="text-xs"
          showPasswordToggle
        />

        <div className="flex items-center justify-between gap-4 pt-0.5">
          <label
            htmlFor="login-remember-me"
            className="flex cursor-pointer items-center gap-2 text-xs text-[#414651]"
          >
            <Checkbox
              id="login-remember-me"
              checked={formData.rememberMe}
              onCheckedChange={(checked) =>
                updateField("rememberMe", checked === true)
              }
              disabled={isSubmitting}
              className="size-4"
            />

            <span>Remember me</span>
          </label>

          <Link
            href="/reset-password"
            className="font-inter text-primary text-sm leading-5 font-medium hover:underline"
          >
            Reset Password
          </Link>
        </div>

        {fieldErrors.rememberMe && (
          <p role="alert" className="text-xs leading-5 text-red-600">
            {fieldErrors.rememberMe}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="font-geist mt-4 h-10 w-full cursor-pointer rounded-xl text-sm leading-5 font-semibold"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-[#E9EAEB]" />

        <span className="font-inter text-sm leading-5 font-normal text-[#717680]">
          OR
        </span>

        <div className="h-px flex-1 bg-[#E9EAEB]" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isSubmitting}
        className="h-11 w-full cursor-pointer gap-2 rounded-xl border-[#D5D7DA] bg-white text-base font-semibold text-[#414651] shadow-[0_1px_2px_0_rgba(10,13,18,0.05)] hover:bg-[#FAFAFA]"
      >
        <Google aria-hidden="true" />
        Sign in with Google
      </Button>

      <p className="font-inter mt-6 text-center text-[14px] leading-5 font-semibold tracking-normal text-[#535862]">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/register"
          className="text-primary font-semibold hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}

async function parseLoginResponse(response: Response): Promise<LoginResponse> {
  const contentType = response.headers.get("content-type")

  if (!contentType?.includes("application/json")) {
    const text = await response.text()

    return {
      message: text || undefined,
    }
  }

  try {
    return (await response.json()) as LoginResponse
  } catch {
    return {}
  }
}

function getLoginErrorMessage(status: number) {
  switch (status) {
    case 400:
      return "Please check the information you entered."

    case 401:
      return "The email address or password is incorrect."

    case 403:
      return "You are not permitted to access this account."

    case 404:
      return "The login service could not be found."

    case 429:
      return "Too many login attempts. Please try again shortly."

    case 500:
      return "The server could not complete the login request."

    default:
      return "Unable to log in. Please try again."
  }
}

function getFieldErrors(error: z.ZodError<LoginInput>): LoginFieldErrors {
  const flattened = z.flattenError(error)

  return {
    email: flattened.fieldErrors.email?.[0],
    password: flattened.fieldErrors.password?.[0],
    rememberMe: flattened.fieldErrors.rememberMe?.[0],
  }
}
