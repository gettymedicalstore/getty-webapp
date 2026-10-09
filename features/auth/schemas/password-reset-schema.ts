import { z } from "zod"
import { GettyIdSchema } from "@/lib/api/getty-contract"

export const requestPasswordResetOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .pipe(z.email("Enter a valid email address.")),
})

export const verifyPasswordResetOtpSchema = z.object({
  reference: GettyIdSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the complete 6-digit verification code."),
})

export const resetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/\d/, "Password must contain a number."),

    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  })

export const resetPasswordSchema = resetPasswordFormSchema.safeExtend(
  verifyPasswordResetOtpSchema.shape
)

export const passwordRecoveryChallengeSchema = z.object({
  email: z.email(),
  reference: GettyIdSchema,
  expiresAt: z.number().finite().nullable(),
  resendAt: z.number().finite(),
})

export type RequestPasswordResetOtpValues = z.infer<
  typeof requestPasswordResetOtpSchema
>

export type VerifyPasswordResetOtpValues = z.infer<
  typeof verifyPasswordResetOtpSchema
>

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
