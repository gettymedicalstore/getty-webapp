import type { z } from "zod"
import { apiData } from "@/lib/api/data"
import { GettyApiError } from "@/lib/api/client"
import {
  ConsumerSignupInputSchema,
  ConsumerConfirmationInputSchema,
  ConsumerResendInputSchema,
  PendingConsumerSignupSchema,
  CompletedConsumerSignupSchema,
} from "@/lib/api/getty-contract"

async function onboarding<Input, Output>(
  path: string,
  input: unknown,
  inputSchema: z.ZodType<Input>,
  outputSchema: z.ZodType<Output>
): Promise<Output> {
  const body = inputSchema.safeParse(input)
  if (!body.success)
    throw new GettyApiError("Please check your details and try again.", 400)
  const result = outputSchema.safeParse(
    await apiData(
      path,
      { method: "POST", body: JSON.stringify(body.data) },
      "anonymous"
    )
  )
  if (!result.success)
    throw new GettyApiError(
      "The signup service returned an incomplete response."
    )
  return result.data
}

export const beginSignup = (input: unknown) =>
  onboarding(
    "/getty/ecommerce/onboarding/v1",
    input,
    ConsumerSignupInputSchema,
    PendingConsumerSignupSchema
  )

export const confirmSignup = (input: unknown) =>
  onboarding(
    "/getty/ecommerce/onboarding/v1/confirm",
    input,
    ConsumerConfirmationInputSchema,
    CompletedConsumerSignupSchema
  )

export const resendSignup = (input: unknown) =>
  onboarding(
    "/getty/ecommerce/onboarding/v1/resend",
    input,
    ConsumerResendInputSchema,
    PendingConsumerSignupSchema
  )
