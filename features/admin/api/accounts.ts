import { apiRequest, GettyApiError } from "@/lib/api/client"
import { apiData } from "@/lib/api/data"
import { z } from "zod"
import {
  ProfileCreationInputSchema,
  ProfileCreationResponseSchema,
  VendorOnboardingInputSchema,
  VendorOnboardingResponseSchema,
} from "@/lib/api/getty-contract"

export async function getVendorOptions() {
  return z
    .array(z.object({ id: z.string().min(1), name: z.string().min(1) }))
    .parse(await apiData("/getty/v1/tenant/vendors/options"))
}

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
