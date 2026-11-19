import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { deliverySchema } from "../schemas/checkout-schema"

export const savedAddressSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().min(1),
  delivery: deliverySchema,
  isDefault: z.boolean(),
})
export type SavedAddress = z.infer<typeof savedAddressSchema>
export type AddressInput = {
  label: string
  delivery: z.input<typeof deliverySchema>
  isDefault?: boolean
}

const root = "/getty/v1/order/addresses"

export async function getSavedAddresses() {
  const data = await apiData(root)
  const parsed = z
    .union([z.array(savedAddressSchema), savedAddressSchema])
    .parse(data)
  return Array.isArray(parsed) ? parsed : [parsed]
}

function saveBody(input: AddressInput) {
  const body = {
    label: z.string().trim().min(1).parse(input.label),
    delivery: deliverySchema.parse(input.delivery),
    ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
  }
  return JSON.stringify(body)
}

export async function createAddress(input: AddressInput) {
  return savedAddressSchema.parse(
    await apiData(root, {
      method: "POST",
      body: saveBody(input),
    })
  )
}

export async function updateAddress(id: string, input: AddressInput) {
  return savedAddressSchema.parse(
    await apiData(`${root}/${encodeURIComponent(z.uuid().parse(id))}`, {
      method: "PUT",
      body: saveBody(input),
    })
  )
}

/** Check the address book after an uncertain POST before creating another entry. */
export function findCreatedAddress(
  addresses: SavedAddress[],
  previousIds: readonly string[],
  input: AddressInput
) {
  const known = new Set(previousIds)
  const delivery = deliverySchema.parse(input.delivery)
  return addresses.find(
    (address) =>
      !known.has(address.id) &&
      address.label === input.label.trim() &&
      address.delivery.name === delivery.name &&
      address.delivery.address === delivery.address &&
      address.delivery.city === delivery.city &&
      address.delivery.state === delivery.state &&
      address.delivery.country === delivery.country
  )
}

export async function deleteAddress(id: string) {
  await apiData<unknown>(`${root}/${encodeURIComponent(z.uuid().parse(id))}`, {
    method: "DELETE",
  })
}
