import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { GettyApiError } from "@/lib/api/client"
import {
  GettyIdSchema,
  ProfileCreationInputSchema,
} from "@/lib/api/getty-contract"

const cursorSchema = z.number().int().safe().nonnegative()
const profileSchema = z.object({
  id: GettyIdSchema,
  tenant: GettyIdSchema,
  name: z.string(),
  role: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.string(),
  photo: z.string().nullable(),
  phoneVerified: z.boolean(),
  emailVerified: z.boolean(),
  reset: z.boolean(),
  cursor: cursorSchema,
})
const profilePageSchema = z.object({
  records: z.array(profileSchema),
  totalRecords: cursorSchema,
  next: cursorSchema,
  previous: cursorSchema,
  isNext: z.boolean(),
  isPrevious: z.boolean(),
})
const roleChoicesSchema = z
  .array(z.object({ key: z.enum(["admin", "user"]), name: z.string().min(1) }))
  .min(1)
export type TeamProfile = z.infer<typeof profileSchema>

export async function getProfileRoles() {
  const parsed = roleChoicesSchema.safeParse(
    await apiData("/getty/v1/tenant/roles")
  )
  if (!parsed.success)
    throw new GettyApiError(
      "We couldn’t load the available roles. Please try again."
    )
  return parsed.data
}

export async function getTeamProfiles(
  input: {
    search?: string
    cursor?: number
    navigation?: "next" | "previous"
  } = {}
) {
  const params = new URLSearchParams({
    cursor: String(cursorSchema.parse(input.cursor ?? 0)),
    navigation: z.enum(["next", "previous"]).parse(input.navigation ?? "next"),
    limit: "20",
  })
  if (input.search?.trim()) params.set("search", input.search.trim())
  const parsed = profilePageSchema.safeParse(
    await apiData(`/getty/v1/tenant/profiles?${params}`)
  )
  if (!parsed.success)
    throw new GettyApiError(
      "The team profile list is incomplete. Please try again."
    )
  return parsed.data
}

export async function updateTeamProfile(input: unknown) {
  const parsed = ProfileCreationInputSchema.extend({
    id: GettyIdSchema,
  }).safeParse(input)
  if (!parsed.success)
    throw new GettyApiError("Please check the profile details.", 400)
  const { id, name, email, phone, role } = parsed.data
  const result = await apiData("/getty/v1/tenant/profile", {
    method: "PUT",
    body: JSON.stringify({
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      role,
    }),
  })
  if (result !== "OK")
    throw new GettyApiError(
      "The profile update could not be confirmed. Refresh the list before trying again."
    )
}

export async function deleteTeamProfile(id: string) {
  const result = await apiData("/getty/v1/tenant/profile", {
    method: "DELETE",
    body: JSON.stringify({ id: GettyIdSchema.parse(id) }),
  })
  if (result !== "OK")
    throw new GettyApiError(
      "The profile deletion could not be confirmed. Refresh the list before trying again."
    )
}
