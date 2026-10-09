import { apiRequest, GettyApiError } from "@/lib/api/client"
import {
  ProfileCreationInputSchema,
  ProfileCreationResponseSchema,
  VendorOnboardingInputSchema,
  VendorOnboardingResponseSchema,
} from "@/lib/api/getty-contract"

export async function createTenantAccount(
  kind: "vendor" | "profile",
  input: unknown
) {
  const parsed = (
    kind === "vendor" ? VendorOnboardingInputSchema : ProfileCreationInputSchema
  ).safeParse(input)
  if (!parsed.success)
    throw new GettyApiError("Please check the account details.", 400)
  const response = await apiRequest(`/getty/v1/tenant/${kind}`, {
    method: "POST",
    body: JSON.stringify(parsed.data),
  })
  const result = (
    kind === "vendor"
      ? VendorOnboardingResponseSchema
      : ProfileCreationResponseSchema
  ).safeParse(response)
  if (!result.success)
    throw new GettyApiError(
      "The account service returned an incomplete response."
    )
  return result.data
}
