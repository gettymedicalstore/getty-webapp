"use client"
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  passwordRecoveryChallengeSchema,
  verifyPasswordResetOtpSchema,
} from "../../schemas/password-reset-schema"
import type {
  PasswordRecoveryChallenge,
  VerifyPasswordResetOtpResponse,
} from "../../types/password-reset"
import {
  PendingConsumerSignupSchema,
  type PendingConsumerSignup,
} from "@/lib/api/getty-contract"

type FlowState = {
  ready: boolean
  challenge: PasswordRecoveryChallenge | null
  verifiedRecovery: VerifyPasswordResetOtpResponse | null
  setChallenge: (value: PasswordRecoveryChallenge) => void
  setVerifiedRecovery: (
    response: VerifyPasswordResetOtpResponse,
    challengeReference: string
  ) => boolean
  clearRecovery: () => void
  signup: PendingConsumerSignup | null
  signupResendAt: number
  setSignup: (value: PendingConsumerSignup | null) => void
}
const Context = createContext<FlowState | null>(null)
const recoveryKey = "getty-password-recovery"
const signupKey = "getty-pending-signup"
const resendKey = "getty-signup-resend-after"
function save(key: string, value: unknown) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value))
    else sessionStorage.removeItem(key)
  } catch {
    /* Keep the current flow usable when storage is blocked. */
  }
}
export default function RecoveryProvider({
  children,
}: {
  children: ReactNode
}) {
  const [ready, setReady] = useState(false),
    [challenge, updateChallenge] = useState<PasswordRecoveryChallenge | null>(
      null
    ),
    [verifiedRecovery, updateVerifiedRecovery] =
      useState<VerifyPasswordResetOtpResponse | null>(null),
    [signup, updateSignup] = useState<PendingConsumerSignup | null>(null),
    [signupResendAt, setSignupResendAt] = useState(0)
  const challengeReference = useRef<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const result = passwordRecoveryChallengeSchema.safeParse(
          JSON.parse(sessionStorage.getItem(recoveryKey) ?? "null")
        )
        if (result.success) {
          challengeReference.current = result.data.reference
          updateChallenge(result.data)
        } else save(recoveryKey, null)
      } catch {}
      try {
        const result = PendingConsumerSignupSchema.safeParse(
          JSON.parse(sessionStorage.getItem(signupKey) ?? "null")
        )
        if (result.success) updateSignup(result.data)
      } catch {}
      try {
        const timestamp = Number(sessionStorage.getItem(resendKey))
        if (Number.isFinite(timestamp))
          setSignupResendAt(Math.min(timestamp, Date.now() + 60000))
      } catch {}
      setReady(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])
  function setChallenge(value: PasswordRecoveryChallenge) {
    challengeReference.current = value.reference
    updateChallenge(value)
    updateVerifiedRecovery(null)
    save(recoveryKey, value)
  }
  function setVerifiedRecovery(
    response: VerifyPasswordResetOtpResponse,
    requestReference: string
  ) {
    if (challengeReference.current !== requestReference) return false
    // OTPs stay in memory; refreshing the password page requires verification again.
    updateVerifiedRecovery(verifyPasswordResetOtpSchema.parse(response))
    return true
  }
  function clearRecovery() {
    challengeReference.current = null
    updateChallenge(null)
    updateVerifiedRecovery(null)
    save(recoveryKey, null)
  }
  function setSignup(value: PendingConsumerSignup | null) {
    updateSignup(value)
    save(signupKey, value)
    const timestamp = value ? Date.now() + 60000 : 0
    setSignupResendAt(timestamp)
    save(resendKey, timestamp)
  }
  return (
    <Context.Provider
      value={{
        ready,
        challenge,
        verifiedRecovery,
        setChallenge,
        setVerifiedRecovery,
        clearRecovery,
        signup,
        signupResendAt,
        setSignup,
      }}
    >
      {children}
    </Context.Provider>
  )
}
export function useAuthFlow() {
  const value = useContext(Context)
  if (!value)
    throw new Error("Authentication pages require their shared layout.")
  return value
}
