import { z } from "zod"

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10),
  addressLineOne: z.string().trim().min(5),
  addressLineTwo: z.string().trim().optional(),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  deliveryNote: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["card", "bank-transfer", "pay-on-delivery"]),
})

export type CheckoutFormSchema = z.infer<typeof checkoutSchema>
