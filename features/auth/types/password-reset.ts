import type { z } from "zod"
import type {
  requestPasswordResetOtpSchema,
  verifyPasswordResetOtpSchema,
  resetPasswordSchema,
  passwordRecoveryChallengeSchema,
} from "../schemas/password-reset-schema"

export type RequestPasswordResetOtpInput = z.infer<
  typeof requestPasswordResetOtpSchema
>

export type RequestPasswordResetOtpResponse = {
  reference: string
  expiresAt: number | null
  resendAt: number
}

export type VerifyPasswordResetOtpInput = z.infer<
  typeof verifyPasswordResetOtpSchema
>

export type VerifyPasswordResetOtpResponse = VerifyPasswordResetOtpInput

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export type ResetPasswordResponse = void

export type PasswordRecoveryChallenge = z.infer<
  typeof passwordRecoveryChallengeSchema
>
