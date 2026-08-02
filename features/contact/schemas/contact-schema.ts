import { z } from "zod"

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(3, "Enter a subject"),
  message: z
    .string()
    .trim()
    .min(10, "Your message must contain at least 10 characters"),
})

export type ContactFormValues = z.infer<typeof contactSchema>
