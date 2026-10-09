import { z } from "zod"
import { apiRequest, GettyApiError } from "@/lib/api/client"
import { changePasswordInputSchema } from "@/lib/form-schemas"

const completionResponse = z.object({
  status: z.literal(200),
  success: z.literal(true),
  data: z.null(),
})

export async function confirmPasswordChange(
  input: z.input<typeof changePasswordInputSchema>
) {
  const parsed = changePasswordInputSchema.safeParse(input)
  if (!parsed.success)
    throw new GettyApiError(parsed.error.issues[0].message, 400)
  const result = completionResponse.safeParse(
    await apiRequest("/getty/v1/tenant/password/change", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    })
  )
  if (!result.success)
    throw new GettyApiError("The password change response is incomplete.")
}
