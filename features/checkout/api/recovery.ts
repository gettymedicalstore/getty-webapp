import { z } from "zod"
import { GettyIdSchema } from "@/lib/api/getty-contract"
import { checkoutCommandSchema, type CheckoutCommand } from "./checkout"

const recoverySchema = z.object({
  command: checkoutCommandSchema.optional(),
  order: GettyIdSchema.optional(),
  payments: z
    .record(
      z.string(),
      z.object({ token: z.string().uuid(), id: GettyIdSchema.optional() })
    )
    .default({}),
})
export type CheckoutRecovery = z.infer<typeof recoverySchema>
const key = (account: string) => `getty-checkout-v1:${account}`
export function readRecovery(account: string): CheckoutRecovery {
  if (typeof window === "undefined") return { payments: {} }
  try {
    const raw = window.localStorage.getItem(key(account))
    return raw ? recoverySchema.parse(JSON.parse(raw)) : { payments: {} }
  } catch {
    return { payments: {} }
  }
}
export function saveRecovery(account: string, value: CheckoutRecovery) {
  const serialized = JSON.stringify(recoverySchema.parse(value))
  window.localStorage.setItem(key(account), serialized)
  if (window.localStorage.getItem(key(account)) !== serialized)
    throw new Error(
      "Allow browser storage before continuing so your order can be recovered."
    )
  return value
}
export function rememberCheckout(account: string, command: CheckoutCommand) {
  const current = readRecovery(account)
  if (
    current.command &&
    JSON.stringify(current.command) !== JSON.stringify(command)
  )
    throw new Error(
      "An order request is awaiting confirmation. Check or retry it before placing another order."
    )
  return saveRecovery(account, { ...current, command })
}
export function rememberOrder(account: string, order: string) {
  const current = readRecovery(account)
  return saveRecovery(account, { payments: current.payments, order })
}
export function forgetCheckout(account: string) {
  const current = readRecovery(account)
  return saveRecovery(account, {
    payments: current.payments,
    order: current.order,
  })
}
export function paymentOperation(
  account: string,
  order: string,
  newAttempt = false
) {
  const current = readRecovery(account)
  const operation = (!newAttempt && current.payments[order]) || {
    token: crypto.randomUUID(),
  }
  saveRecovery(account, {
    ...current,
    order,
    payments: { ...current.payments, [order]: operation },
  })
  return operation
}
export function rememberPayment(
  account: string,
  order: string,
  token: string,
  id: string
) {
  const current = readRecovery(account)
  saveRecovery(account, {
    ...current,
    order,
    payments: { ...current.payments, [order]: { token, id } },
  })
}
