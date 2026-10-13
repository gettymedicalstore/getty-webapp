"use client"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"
import { otpFormSchema } from "@/lib/form-schemas"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
} from "lucide-react"
import {
  AuthFormHeading,
  AuthProgress,
} from "@/components/shared/auth-form-heading"
import { Button } from "@/components/ui/button"
import { AuthFormSkeleton } from "@/components/shared/loading-skeletons"
import { authHref } from "@/lib/auth/navigation"
import { useAuthFlow } from "./recovery-provider"
import {
  useRequestPasswordResetOtp,
  useResendPasswordResetOtp,
  useResetPassword,
  useVerifyPasswordResetOtp,
} from "../../hooks/use-password-reset"
import {
  requestPasswordResetOtpSchema,
  resetPasswordFormSchema,
} from "../../schemas/password-reset-schema"
import { FormOtpInput } from "./otp-input"

export default function ForgotPasswordFlow({
  step,
  returnTo,
}: {
  step: "email" | "otp" | "password"
  returnTo?: string
}) {
  const flow = useAuthFlow(),
    router = useRouter()
  const request = useRequestPasswordResetOtp(),
    resendRequest = useResendPasswordResetOtp(),
    verify = useVerifyPasswordResetOtp(),
    reset = useResetPassword()
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [done, setDone] = useState(false),
    [now, setNow] = useState(() => Date.now())
  const busy =
    request.isPending ||
    resendRequest.isPending ||
    verify.isPending ||
    reset.isPending
  const challenge = flow.challenge
  const href = (path: string) => authHref(path, returnTo)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  async function sendCode(address: string) {
    const result = await request.mutateAsync({ email: address })
    setNow(Date.now())
    flow.setChallenge({
      email: address,
      ...result,
    })
  }
  const schema =
    step === "email"
      ? requestPasswordResetOtpSchema
      : step === "otp"
        ? otpFormSchema
        : resetPasswordFormSchema
  async function submit(values: {
    email?: string
    otp?: string
    password?: string
    confirmPassword?: string
  }) {
    if (busy) return
    setError("")
    setNotice("")
    try {
      if (step === "email") {
        await sendCode(values.email ?? "")
        router.push(href("/verify-otp"))
      } else if (step === "otp" && challenge) {
        if (challenge.expiresAt !== null && now >= challenge.expiresAt)
          throw new Error("This code has expired. Request a new code below.")
        const response = await verify.mutateAsync({
          reference: challenge.reference,
          otp: values.otp ?? "",
        })
        if (flow.setVerifiedRecovery(response, challenge.reference))
          router.push(href("/reset-password"))
      } else if (step === "password" && flow.verifiedRecovery) {
        // The returned verification credentials have their own backend validity.
        await reset.mutateAsync({
          reference: flow.verifiedRecovery.reference,
          otp: flow.verifiedRecovery.otp,
          password: values.password ?? "",
          confirmPassword: values.confirmPassword ?? "",
        })
        flow.clearRecovery()
        setDone(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.")
    }
  }
  async function resend() {
    if (!challenge || busy || Date.now() < challenge.resendAt) return
    setError("")
    try {
      const result = await resendRequest.mutateAsync({
        reference: challenge.reference,
      })
      setNow(Date.now())
      flow.setChallenge({ email: challenge.email, ...result })
      setNotice("A new code has been requested. Use the latest email.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resend code.")
    }
  }
  if (!flow.ready) return <AuthFormSkeleton />
  if (done)
    return (
      <div className="text-center">
        <CheckCircle2
          aria-hidden
          className="text-primary mx-auto mb-6 size-12"
        />
        <AuthFormHeading
          title="Password updated"
          description="Log in with your new password to continue where you left off."
        />
        <Link
          href={href("/login")}
          replace
          className="bg-primary hover:bg-primary-darker mt-7 flex min-h-13 items-center justify-center rounded-lg text-sm font-semibold text-white transition"
        >
          Back to login
        </Link>
      </div>
    )
  const missing =
    (step === "otp" && !challenge) ||
    (step === "password" && !flow.verifiedRecovery)
  if (missing)
    return (
      <div>
        <KeyRound aria-hidden className="text-primary mb-6 size-8" />
        <AuthFormHeading
          eyebrow="Account recovery"
          title="Let’s verify your email"
          description="Request a verification code to reset your password. If your previous session has ended, you can start again here."
        />
        <Link
          href={href(challenge ? "/verify-otp" : "/forgot-password")}
          replace
          className="bg-primary hover:bg-primary-darker mt-6 flex min-h-13 items-center justify-center rounded-lg text-sm font-semibold text-white transition"
        >
          {challenge ? "Verify your code" : "Request a code"}
        </Link>
        <BackLink href={href("/login")} />
      </div>
    )
  const index = step === "email" ? 0 : step === "otp" ? 1 : 2
  const expired = Boolean(
    challenge && challenge.expiresAt !== null && now >= challenge.expiresAt
  )
  const resendIn = Math.max(
    0,
    Math.ceil(((challenge?.resendAt ?? 0) - now) / 1000)
  )
  return (
    <div>
      <AuthProgress
        steps={["Email", "Verify", "Password"]}
        current={index}
        label="Password recovery progress"
      />
      <AuthFormHeading
        title={
          step === "email"
            ? "Forgot your password?"
            : step === "otp"
              ? "Check your email"
              : "Set a new password"
        }
        description={
          step === "email"
            ? "Enter your account email and we’ll help you get back in."
            : step === "otp"
              ? `Check ${challenge?.email} for the 6-digit code. Use the code from your latest password reset email.`
              : "Choose a strong new password to keep your Getty account secure."
        }
      />
      <ValidatedForm<Record<string, string>, Record<string, string>>
        key={`${step}:${challenge?.reference ?? ""}:${challenge?.expiresAt ?? ""}`}
        schema={schema}
        onSubmit={submit}
        className="mt-7 space-y-5"
      >
        {step === "email" && (
          <FormInputField
            label="Email address"
            type="email"
            autoComplete="email"
            name="email"
            placeholder="you@example.com"
            required
            disabled={busy}
          />
        )}
        {step === "otp" && (
          <>
            <FormOtpInput disabled={busy || expired} />
            {expired && (
              <p role="status" className="text-sm text-amber-800">
                This code has expired. Request a new one below.
              </p>
            )}
          </>
        )}
        {step === "password" && (
          <>
            <FormInputField
              label="New password"
              type="password"
              autoComplete="new-password"
              name="password"
              required
              disabled={busy}
            />
            <p className="text-muted-foreground text-xs leading-5">
              At least 8 characters with uppercase, lowercase and a number.
            </p>
            <FormInputField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              name="confirmPassword"
              required
              disabled={busy}
            />
          </>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-primary text-sm">
            {notice}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || (step === "otp" && expired)}
          aria-busy={busy}
          className="h-13 w-full rounded-lg text-sm font-semibold"
        >
          {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {busy
            ? "Please wait…"
            : step === "email"
              ? "Send verification code"
              : step === "otp"
                ? "Verify code"
                : "Update password"}
          {!busy && <ArrowRight aria-hidden className="ml-1 size-4" />}
        </Button>
      </ValidatedForm>
      {step === "otp" && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => void resend()}
            disabled={busy || resendIn > 0}
            className="text-primary disabled:text-muted-foreground min-h-11 text-sm font-medium"
          >
            {resendIn
              ? `Resend code in ${Math.floor(resendIn / 60)}:${String(
                  resendIn % 60
                ).padStart(2, "0")}`
              : "Resend code"}
          </button>
          <Link
            href={href("/forgot-password")}
            className="text-primary block py-3 text-sm"
          >
            Change email address
          </Link>
        </div>
      )}
      <BackLink href={href("/login")} />
    </div>
  )
}
function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-primary mt-6 flex min-h-11 items-center justify-center gap-2 text-sm"
    >
      <ArrowLeft className="size-4" />
      Back to login
    </Link>
  )
}
