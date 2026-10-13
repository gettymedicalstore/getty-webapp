import { z } from "zod"

const text = (name: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${name}.`)
    .max(max, `Use ${max} characters or fewer.`)

export const deliverySchema = z.object({
  name: text("the recipient's name", 120),
  phone: text("a phone number", 30),
  address: text("the delivery address", 300),
  city: text("a city", 100),
  state: text("a state", 100),
  country: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}$/, "Enter a two-letter country code.")
    .transform((v) => v.toUpperCase()),
  postcode: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .optional()
    .transform((v) => v || null),
})
export const checkoutSchema = deliverySchema.extend({
  notes: z
    .string()
    .trim()
    .max(1000, "Use 1,000 characters or fewer.")
    .optional(),
})
export type Delivery = z.output<typeof deliverySchema>
export type CheckoutFormSchema = z.output<typeof checkoutSchema>
