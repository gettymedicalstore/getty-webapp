import { z } from "zod"

export const SessionTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  fingerprint: z.string().min(1).optional(),
})

export type SessionTokens = z.infer<typeof SessionTokensSchema>
