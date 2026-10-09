import { z } from "zod"
import { apiRequest, GettyApiError } from "@/lib/api/client"
import { GettyIdSchema } from "@/lib/api/getty-contract"
import {
  requestPasswordResetOtpSchema,
  verifyPasswordResetOtpSchema,
  resetPasswordSchema,
} from "../schemas/password-reset-schema"
import type {
  RequestPasswordResetOtpInput,
  RequestPasswordResetOtpResponse,
  VerifyPasswordResetOtpInput,
  VerifyPasswordResetOtpResponse,
  ResetPasswordInput,
} from "../types/password-reset"

// Initiation returns reference and expiresAt in Getty's data envelope.
const referenceResultSchema = z.union([
  z.object({
    reference: GettyIdSchema,
    expiresAt: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() || null : value),
      z.iso.datetime({ offset: true }).nullish()
    ),
  }),
  GettyIdSchema.transform((reference) => ({ reference })),
])

function responseData(response: unknown) {
  const envelope = z.object({ data: z.unknown() }).safeParse(response)
  return envelope.success ? envelope.data.data : response
}

function readReference(response: unknown) {
  const parsed = referenceResultSchema.safeParse(responseData(response))
  if (!parsed.success)
    throw new GettyApiError(
      "The password reset service did not return a valid reference. Please contact support."
    )
  return parsed.data
}

export async function requestPasswordResetOtp(
  input: RequestPasswordResetOtpInput
): Promise<RequestPasswordResetOtpResponse> {
  const { email } = requestPasswordResetOtpSchema.parse(input)
  const reference = readReference(
    await apiRequest(
      `/getty/account/v1/password/reset/${encodeURIComponent(email)}`,
      { method: "POST" },
      "public"
    )
  )
  const expiresAt =
    "expiresAt" in reference && reference.expiresAt
      ? Date.parse(reference.expiresAt)
      : null
  return {
    reference: reference.reference,
    expiresAt,
    resendAt: expiresAt ?? Date.now() + 5 * 60_000,
  }
}

export async function verifyPasswordResetOtp(
  input: VerifyPasswordResetOtpInput
): Promise<VerifyPasswordResetOtpResponse> {
  const values = verifyPasswordResetOtpSchema.parse(input)
  const result = verifyPasswordResetOtpSchema.safeParse(
    responseData(
      await apiRequest(
        "/getty/account/v1/password/reset/verify",
        { method: "POST", body: JSON.stringify(values) },
        "public"
      )
    )
  )
  if (!result.success)
    throw new GettyApiError(
      "The password reset service did not return valid verification details. Please request a new code."
    )
  return result.data
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const { reference, otp, password } = resetPasswordSchema.parse(input)
  await apiRequest(
    "/getty/account/v1/password/reset/confirm",
    {
      method: "PATCH",
      body: JSON.stringify({ reference, otp, password }),
    },
    "public"
  )
}
