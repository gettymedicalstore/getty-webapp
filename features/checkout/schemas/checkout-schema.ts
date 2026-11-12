import { z } from "zod"
import { signupPhoneDetails } from "@/lib/signup-phone"
import { nigeriaStates } from "../nigeria-states"

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
export const checkoutSchema = deliverySchema
  .omit({ country: true })
  .extend({
    phoneCountry: z.string().length(2, "Choose a country calling code."),
    notes: z
      .string()
      .trim()
      .max(1000, "Use 1,000 characters or fewer.")
      .optional(),
  })
  .superRefine((values, context) => {
    if (
      values.phoneCountry === "NG" &&
      !nigeriaStates.some((state) => state === values.state)
    ) {
      context.addIssue({
        code: "custom",
        path: ["state"],
        message: "Choose a state or the FCT.",
      })
    }
    try {
      signupPhoneDetails(values.phone, values.phoneCountry)
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message:
          error instanceof Error
            ? error.message
            : "Enter a valid phone number.",
      })
    }
  })
export type Delivery = z.output<typeof deliverySchema>
export type CheckoutFormSchema = z.output<typeof checkoutSchema>

export function deliveryFromCheckoutForm(values: CheckoutFormSchema): Delivery {
  const { phone, country } = signupPhoneDetails(
    values.phone,
    values.phoneCountry
  )
  return deliverySchema.parse({
    name: values.name,
    phone,
    address: values.address,
    city: values.city,
    state: values.state,
    country,
    postcode: values.postcode,
  })
}
