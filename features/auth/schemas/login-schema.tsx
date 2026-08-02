import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .email({
      error: "Enter a valid email address.",
    })
    .trim()
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, {
      error: "Password is required.",
    })
    .min(6, {
      error: "Password must contain at least 6 characters.",
    }),

  rememberMe: z.boolean(),
})

export type LoginInput = z.infer<typeof loginSchema>
