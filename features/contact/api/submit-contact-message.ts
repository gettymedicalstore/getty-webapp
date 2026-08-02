import type { ContactFormValues } from "../schemas/contact-schema"

export async function submitContactMessage(values: ContactFormValues) {
  await new Promise((resolve) => setTimeout(resolve, 600))

  return {
    success: true,
    reference: `GMS-CONTACT-${Date.now()}`,
    values,
  }
}
