"use client"

import { CheckCircle2, ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import { useEffect, useState, type SyntheticEvent } from "react"
import { toast } from "sonner"

import { AppLogoHead } from "@/components/shared/app-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  useRequestPasswordResetOtp,
  useResetPassword,
  useVerifyPasswordResetOtp,
} from "../../hooks/use-password-reset"
import {
  requestPasswordResetOtpSchema,
  resetPasswordSchema,
  verifyPasswordResetOtpSchema,
} from "../../schemas/password-reset-schema"
import OtpInput from "./otp-input"

type ResetStep = "email" | "otp" | "password" | "success"

type ForgotPasswordFlowProps = {
  initialEmail?: string
  onBackToLogin: () => void
}

export default function ForgotPasswordFlow({
  initialEmail = "",
  onBackToLogin,
}: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<ResetStep>("email")

  const [email, setEmail] = useState(initialEmail)
  const [maskedEmail, setMaskedEmail] = useState("")
  const [challengeId, setChallengeId] = useState("")
  const [otp, setOtp] = useState("")
  const [resetToken, setResetToken] = useState("")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [secondsRemaining, setSecondsRemaining] = useState(0)

  const [error, setError] = useState("")

  const requestOtp = useRequestPasswordResetOtp()
  const verifyOtp = useVerifyPasswordResetOtp()
  const resetPassword = useResetPassword()

  const isBusy =
    requestOtp.isPending || verifyOtp.isPending || resetPassword.isPending

  useEffect(() => {
    if (step !== "otp" || secondsRemaining <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [secondsRemaining, step])

  async function submitEmail(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const validation = requestPasswordResetOtpSchema.safeParse({
      email,
    })

    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "Enter a valid email address."
      )

      return
    }

    try {
      const result = await requestOtp.mutateAsync({
        email: validation.data.email,
      })

      setEmail(validation.data.email)
      setMaskedEmail(result.maskedEmail)
      setChallengeId(result.challengeId)
      setSecondsRemaining(result.expiresInSeconds)
      setOtp("")
      setStep("otp")

      if (result.developmentOtp) {
        console.info("Development password reset OTP:", result.developmentOtp)
      }

      toast.success("A verification code has been sent.")
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function submitOtp(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const validation = verifyPasswordResetOtpSchema.safeParse({
      email,
      challengeId,
      otp,
    })

    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "Enter the verification code."
      )

      return
    }

    try {
      const result = await verifyOtp.mutateAsync(validation.data)

      setResetToken(result.resetToken)
      setStep("password")
      toast.success("Email verified successfully.")
    } catch (verificationError) {
      setError(getErrorMessage(verificationError))
    }
  }

  async function submitPassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const validation = resetPasswordSchema.safeParse({
      resetToken,
      password,
      confirmPassword,
    })

    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "The new password is invalid."
      )

      return
    }

    try {
      await resetPassword.mutateAsync(validation.data)

      setStep("success")
      toast.success("Your password has been reset successfully.")
    } catch (resetError) {
      setError(getErrorMessage(resetError))
    }
  }

  async function resendOtp() {
    if (secondsRemaining > 0 || requestOtp.isPending) {
      return
    }

    setError("")

    try {
      const result = await requestOtp.mutateAsync({
        email,
      })

      setChallengeId(result.challengeId)
      setSecondsRemaining(result.expiresInSeconds)
      setOtp("")

      toast.success("A new verification code has been sent.")
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  function restartEmailStep() {
    setStep("email")
    setOtp("")
    setChallengeId("")
    setResetToken("")
    setError("")
  }

  if (step === "success") {
    return (
      <div className="w-full bg-white px-6 py-9 text-center sm:px-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#ECFDF3]">
          <CheckCircle2 aria-hidden className="size-8 text-[#058A51]" />
        </div>

        <h2 className="mt-6 text-2xl font-semibold text-[#181D27]">
          Password changed successfully
        </h2>

        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#717680]">
          Your password has been updated. You can now sign in using your new
          password.
        </p>

        <Button
          type="button"
          onClick={onBackToLogin}
          className="mt-8 h-12 w-full rounded-xl bg-[#058A51] font-semibold text-white hover:bg-[#027A48]"
        >
          Back to login
        </Button>
      </div>
    )
  }

  if (step === "password") {
    return (
      <form
        onSubmit={submitPassword}
        className="w-full bg-white px-6 py-8 sm:px-10"
      >
        <AuthHeader
          title="Set your password"
          description="Choose a secure password that you can remember."
        />

        <ErrorAlert message={error} />

        <div className="mt-7 space-y-5">
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            visible={showPassword}
            disabled={isBusy}
            onChange={setPassword}
            onToggle={() => setShowPassword((current) => !current)}
          />

          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            visible={showConfirmPassword}
            disabled={isBusy}
            onChange={setConfirmPassword}
            onToggle={() => setShowConfirmPassword((current) => !current)}
          />
        </div>

        <div className="mt-5 rounded-lg bg-[#F8F9FA] px-4 py-3 text-xs leading-5 text-[#717680]">
          Use at least 8 characters, including uppercase, lowercase, number and
          special character.
        </div>

        <Button
          type="submit"
          disabled={isBusy || !password || !confirmPassword}
          className="mt-6 h-12 w-full rounded-xl bg-[#058A51] font-semibold text-white hover:bg-[#027A48]"
        >
          {resetPassword.isPending ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Saving password...
            </>
          ) : (
            "Save as new password"
          )}
        </Button>
      </form>
    )
  }

  if (step === "otp") {
    return (
      <form onSubmit={submitOtp} className="w-full bg-white px-6 py-8 sm:px-10">
        <AuthHeader
          title="Verify your email"
          description="Enter the verification code sent to your email."
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-[#717680]">
            Please enter the 4-digit code sent to
          </p>

          <p className="mt-1 font-medium text-[#181D27]">{maskedEmail}</p>
        </div>

        <ErrorAlert message={error} />

        <div className="mt-7">
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value)
              setError("")
            }}
            disabled={isBusy}
            error={Boolean(error)}
          />
        </div>

        <div className="mt-4 flex justify-center gap-1 text-sm">
          {secondsRemaining > 0 ? (
            <span className="text-[#717680]">
              ({formatSeconds(secondsRemaining)})
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => void resendOtp()}
            disabled={secondsRemaining > 0 || requestOtp.isPending}
            className="font-medium text-[#058A51] disabled:cursor-not-allowed disabled:text-[#A4A7AE]"
          >
            {requestOtp.isPending ? "Sending..." : "Resend code"}
          </button>
        </div>

        <button
          type="button"
          onClick={restartEmailStep}
          disabled={isBusy}
          className="mx-auto mt-3 block text-sm font-medium text-[#058A51] hover:underline"
        >
          Change email address
        </button>

        <Button
          type="submit"
          disabled={isBusy || otp.length !== 4}
          className="mt-7 h-12 w-full rounded-xl bg-[#058A51] font-semibold text-white hover:bg-[#027A48]"
        >
          {verifyOtp.isPending ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    )
  }

  return (
    <form
      onSubmit={submitEmail}
      className="relative w-full bg-white px-6 py-8 sm:px-10"
    >
      <AuthHeader
        title="Reset your password"
        description="Enter the email address associated with your account and we will send you a verification code."
      />

      <ErrorAlert message={error} />

      <div className="mt-7">
        <label
          htmlFor="password-reset-email"
          className="mb-2 block text-sm font-medium text-[#414651]"
        >
          Email address
        </label>

        <Input
          id="password-reset-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError("")
          }}
          autoComplete="email"
          placeholder="Enter your email address"
          disabled={isBusy}
          className="h-12 rounded-lg"
        />
      </div>

      <Button
        type="submit"
        disabled={isBusy || !email.trim()}
        className="mt-6 h-12 w-full rounded-xl bg-[#058A51] font-semibold text-white hover:bg-[#027A48]"
      >
        {requestOtp.isPending ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Sending code...
          </>
        ) : (
          "Send verification code"
        )}
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        disabled={isBusy}
        className="mx-auto mt-5 block text-sm font-medium text-[#058A51] hover:underline"
      >
        Back to login
      </button>
    </form>
  )
}

function AuthHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <>
      <div className="flex justify-center">
        <div className="origin-center scale-75">
          <AppLogoHead />
        </div>
      </div>

      <div className="mt-4 text-center">
        <h2 className="text-xl font-semibold text-[#181D27]">{title}</h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#717680]">
          {description}
        </p>
      </div>
    </>
  )
}

function ErrorAlert({ message }: { message: string }) {
  if (!message) {
    return null
  }

  return (
    <div
      role="alert"
      className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  visible,
  disabled,
  onChange,
  onToggle,
}: {
  id: string
  label: string
  value: string
  visible: boolean
  disabled: boolean
  onChange: (value: string) => void
  onToggle: () => void
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#414651]"
      >
        {label}
      </label>

      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          placeholder="Enter your password"
          disabled={disabled}
          className="h-12 rounded-lg pr-12"
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-md text-[#717680] hover:bg-[#F5F5F5]"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-5" />
          ) : (
            <Eye aria-hidden className="size-5" />
          )}
        </button>
      </div>
    </div>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The request could not be completed."
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}
