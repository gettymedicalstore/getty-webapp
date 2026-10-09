"use client"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"
import { otpFormSchema, signupFormSchema } from "@/lib/form-schemas"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import {
  AuthFormHeading,
  AuthProgress,
} from "@/components/shared/auth-form-heading"
import { beginSignup, confirmSignup, resendSignup } from "../api/onboarding"
import { authHref } from "@/lib/auth/navigation"
import SignupPhoneField from "@/components/shared/form/signup-phone-field"
import { Button } from "@/components/ui/button"
import { AuthFormSkeleton } from "@/components/shared/loading-skeletons"
import { useAuthFlow } from "./reset-password/recovery-provider"
import { signupPhoneDetails } from "@/lib/signup-phone"
import { FormOtpInput } from "./reset-password/otp-input"
import styles from "./consumer-signup.module.css"

export default function ConsumerSignup({
  step = "details",
  returnTo,
}: {
  step?: "details" | "verify"
  returnTo?: string
}) {
  const flow = useAuthFlow(),
    router = useRouter(),
    pending = flow.signup
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [notice, setNotice] = useState(""),
    [now, setNow] = useState(() => Date.now())
  const resendAfter = flow.signupResendAt
  const href = (path: string) => authHref(path, returnTo)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.")
    } finally {
      setBusy(false)
    }
  }
  async function submit(values: {
    otp?: string
    phone?: string
    country?: string
    [key: string]: unknown
  }) {
    await run(async () => {
      if (step === "verify" && pending) {
        await confirmSignup({ reference: pending.reference, otp: values.otp })
        flow.setSignup(null)
        setDone(true)
      } else {
        const details = signupPhoneDetails(
          String(values.phone ?? ""),
          String(values.country ?? "")
        )
        const result = await beginSignup({ ...values, ...details })
        flow.setSignup(result)
        router.push(href("/verify-email"))
      }
    })
  }
  const expired = pending ? now >= Date.parse(pending.expiresAt) : false,
    codeExpired = pending ? now >= Date.parse(pending.codeExpiresAt) : false
  if (!flow.ready) return <AuthFormSkeleton />
  if (done)
    return (
      <div data-signup-screen className="text-center">
        <CheckCircle2
          aria-hidden
          className="text-primary mx-auto mb-6 size-12"
        />
        <AuthFormHeading
          title="You’re all set"
          description="Check your email for your temporary login password. Use it to log in and continue."
        />
        <Link
          href={href("/login")}
          replace
          className="bg-primary hover:bg-primary-darker mt-7 flex min-h-13 items-center justify-center rounded-lg text-sm font-semibold text-white transition"
        >
          Continue to login
        </Link>
      </div>
    )
  if (step === "verify" && !pending)
    return (
      <div data-signup-screen>
        <AuthProgress
          steps={["Your details", "Verify email"]}
          current={0}
          label="Account registration progress"
        />
        <AuthFormHeading
          title="Let’s get you started"
          description="Create an account to receive an email verification code."
        />
        <Link
          href={href("/register")}
          replace
          className="bg-primary hover:bg-primary-darker mt-6 flex min-h-13 items-center justify-center rounded-lg text-sm font-semibold text-white transition"
        >
          Create an account
        </Link>
      </div>
    )
  return (
    <div data-signup-screen>
      <AuthProgress
        steps={["Your details", "Verify email"]}
        current={step === "verify" ? 1 : 0}
        label="Account registration progress"
      />
      <AuthFormHeading
        title={step === "verify" ? "Check your inbox" : "Create your account"}
        description={
          step === "verify"
            ? "Enter the code from your latest verification email. Check your spam folder if it hasn’t arrived."
            : "Create a Getty account for your organisation. Start with a few details below."
        }
      />
      {step === "details" && pending && !expired && (
        <p className="mt-5 rounded-xl bg-[#f1f6ec] p-4 text-sm">
          Already requested a code?{" "}
          <Link
            className="text-primary font-semibold underline"
            href={href("/verify-email")}
          >
            Continue verification
          </Link>
        </p>
      )}
      <ValidatedForm<Record<string, string>, Record<string, string>>
        key={`${step}:${pending?.codeExpiresAt ?? ""}`}
        schema={step === "verify" ? otpFormSchema : signupFormSchema}
        onSubmit={submit}
        className="mt-7 space-y-4"
      >
        {step === "verify" ? (
          <FormOtpInput disabled={busy || expired || codeExpired} />
        ) : (
          <>
            <FormInputField
              label="Business or organisation name"
              name="name"
              autoComplete="organization"
              placeholder="Your organisation’s name"
              required
              maxLength={180}
              disabled={busy}
            />
            <FormInputField
              label="Contact person"
              name="contact"
              autoComplete="name"
              placeholder="Full name"
              required
              maxLength={180}
              disabled={busy}
            />
            <div className={styles.emailPhone}>
              <FormInputField
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
                disabled={busy}
              />
              <SignupPhoneField disabled={busy} />
            </div>
            <FormInputField
              label="Address"
              name="address"
              autoComplete="street-address"
              placeholder="Street address, city"
              required
              maxLength={1000}
              disabled={busy}
            />
          </>
        )}
        {step === "verify" && expired && (
          <p role="alert" className="text-sm text-amber-800">
            This signup has expired. Start a new signup below.
          </p>
        )}
        {step === "verify" && codeExpired && !expired && (
          <p role="status" className="text-sm text-amber-800">
            This code has expired. Request a new code below.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-primary text-sm">
            {notice}
          </p>
        )}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={busy || (step === "verify" && (expired || codeExpired))}
            aria-busy={busy}
            className="h-13 w-full rounded-lg text-sm font-semibold"
          >
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {busy
              ? "Please wait…"
              : step === "verify"
                ? "Verify email"
                : "Send verification code"}
            {!busy && <ArrowRight aria-hidden className="ml-1 size-4" />}
          </Button>
        </div>
      </ValidatedForm>
      {step === "verify" && pending && (
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={busy || expired || now < resendAfter}
            className="text-primary disabled:text-muted-foreground min-h-11 font-medium"
            onClick={() =>
              void run(async () => {
                flow.setSignup(
                  await resendSignup({ reference: pending.reference })
                )
                setNotice(
                  "A new verification email has been queued. Use the latest code."
                )
              })
            }
          >
            {now < resendAfter
              ? `Resend in ${Math.ceil((resendAfter - now) / 1000)}s`
              : "Resend code"}
          </button>
          <Link
            href={href("/register")}
            onNavigate={() => flow.setSignup(null)}
            className="text-muted-foreground inline-flex min-h-11 items-center"
          >
            Start again
          </Link>
        </div>
      )}
      <p className="text-muted-foreground mt-6 border-t border-[#e9edea] pt-4 text-center text-sm">
        Already have an account?{" "}
        <Link
          className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline"
          href={href("/login")}
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
