import type { ContactFormValues } from "../schemas/contact-schema"
import { unavailable } from "@/lib/api/client"

export async function submitContactMessage(_values: ContactFormValues) {
  void _values
  return unavailable(
    "Online enquiries are temporarily unavailable. Please use the contact details on this page."
  )
}
