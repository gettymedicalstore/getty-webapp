import { z } from "zod"

export const requestPasswordResetOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .pipe(z.email("Enter a valid email address.")),
})

export const verifyPasswordResetOtpSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),

  challengeId: z
    .string()
    .trim()
    .min(1, "The password reset request is invalid."),

  otp: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the complete 4-digit verification code."),
})

export const resetPasswordSchema = z
  .object({
    resetToken: z
      .string()
      .trim()
      .min(1, "The password reset token is required."),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/\d/, "Password must contain a number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain a special character."),

    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  })

export type RequestPasswordResetOtpValues = z.infer<
  typeof requestPasswordResetOtpSchema
>

export type VerifyPasswordResetOtpValues = z.infer<
  typeof verifyPasswordResetOtpSchema
>

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
