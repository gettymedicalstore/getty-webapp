import { z } from "zod"
import { apiRequest, GettyApiError } from "@/lib/api/client"
import { backendRole } from "../server/backend-role"
import { clearSession, saveSession, readSession } from "./session-store"
import { sendGettyRequest, unwrapGettyResponse } from "@/lib/api/transport"
import type { GettyUser } from "../types/session"
import { SessionTokensSchema } from "../schemas/token-schema"
const loginResponse = z.object({
  status: z.literal(200),
  success: z.literal(true),
  tokens: SessionTokensSchema,
  data: z.object({
    id: z.string().optional(),
    email: z.email(),
    name: z.string().min(1),
    phone: z.string().nullish(),
    role: z.string().trim().min(1),
    type: z.string().trim().min(1),
    tenant: z.string().nullish(),
    status: z.string().optional(),
    tenantStatus: z.string().optional(),
    resetPassword: z.boolean().optional(),
  }),
})
export async function login(email: string, password: string) {
  const parsed = loginResponse.safeParse(
    await apiRequest(
      "/auth/getty/login",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      },
      "anonymous"
    )
  )
  if (!parsed.success)
    throw new GettyApiError(
      "The login response is incomplete. Please contact support."
    )
  const { data, tokens } = parsed.data
  const user: GettyUser = {
    id: data.id ?? data.email,
    email: data.email,
    name: data.name,
    phone: data.phone ?? undefined,
    profileRole: data.role?.toLowerCase(),
    tenantType: data.type?.toLowerCase(),
    tenant: data.tenant ?? undefined,
    status: data.status?.trim().toLowerCase(),
    tenantStatus: data.tenantStatus?.trim().toLowerCase(),
    resetPassword: data.resetPassword,
    role: backendRole(data.type, data.role),
  }
  saveSession(user, tokens)
  return { user, message: "Login successful." }
}
export async function logout() {
  const session = readSession()
  clearSession()
  if (session.user)
    unwrapGettyResponse(
      await sendGettyRequest(
        "/auth/getty/logout",
        { method: "POST", body: JSON.stringify({}) },
        session.accessToken
      )
    )
}
