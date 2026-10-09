"use client"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"

import Link from "next/link"
import { useId, useState } from "react"
import { toast } from "sonner"

import { AuthFormHeading } from "@/components/shared/auth-form-heading"
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { login } from "../api/auth"
import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/schemas/login-schema"
import { cn } from "@/lib/utils"
import { authHref } from "@/lib/auth/navigation"

type LoginFormProps = {
  onSuccess?: () => void | Promise<void>
  className?: string
  returnTo?: string
}

export default function LoginForm({
  onSuccess,
  className,
  returnTo,
}: LoginFormProps) {
  const formId = useId()
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  async function handleSubmit(values: LoginInput) {
    if (isSubmitting) return
    setSubmitError("")
    setIsSubmitting(true)

    try {
      const result = await login(values.email, values.password)
      toast.success(result.message)
      await onSuccess?.()
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to log in. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("w-full bg-white px-6 py-8 sm:px-8", className)}>
      <AuthFormHeading
        eyebrow="Your Getty account"
        title="Welcome back"
        description="Log in to manage your orders, explore medical essentials and keep things moving."
      />

      <ValidatedForm
        schema={loginSchema}
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 space-y-5"
      >
        <FormInputField
          id={`${formId}-email`}
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          disabled={isSubmitting}
          labelClassName="text-sm"
        />

        <FormInputField
          id={`${formId}-password`}
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={isSubmitting}
          labelClassName="text-sm"
          showPasswordToggle
        />

        <div className="-mt-3 flex items-center justify-end">
          <Link
            href={authHref("/forgot-password", returnTo)}
            className="text-primary inline-flex min-h-11 items-center text-sm font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm leading-6 text-red-800"
          >
            <AlertCircle className="mt-1 size-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="h-13 w-full rounded-lg text-sm font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing you in…
            </>
          ) : (
            <>
              Log in <ArrowRight className="ml-1 size-4" aria-hidden />
            </>
          )}
        </Button>
      </ValidatedForm>

      <p className="mt-8 border-t border-[#e9edea] pt-6 text-center text-sm leading-6 text-[#64716b]">
        Don&apos;t have an account yet?{" "}
        <Link
          href={authHref("/register", returnTo)}
          className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
