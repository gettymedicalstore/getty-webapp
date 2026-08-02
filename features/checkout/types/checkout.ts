export type CheckoutCustomer = {
  id: string
  name: string
  email: string
  phone?: string
}

export type CheckoutFormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  addressLineOne: string
  addressLineTwo?: string
  city: string
  state: string
  deliveryNote?: string
  paymentMethod: "card" | "bank-transfer" | "pay-on-delivery"
}
