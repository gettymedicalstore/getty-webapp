import { z } from "zod"
import { GettyIdSchema } from "@/lib/api/getty-contract"
import { checkoutCommandSchema, type CheckoutCommand } from "./checkout"

const recoverySchema = z.object({
  command: checkoutCommandSchema.optional(),
  issue: z.string().max(300).optional(),
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
    const raw = window.sessionStorage.getItem(key(account))
    if (!raw) {
      // Preserve unresolved checkouts from the previous local-storage version.
      const legacy = window.localStorage.getItem(key(account))
      if (legacy) {
        const migrated = recoverySchema.parse(JSON.parse(legacy))
        window.sessionStorage.setItem(key(account), JSON.stringify(migrated))
        window.localStorage.removeItem(key(account))
        return migrated
      }
    }
    return raw ? recoverySchema.parse(JSON.parse(raw)) : { payments: {} }
  } catch {
    return { payments: {} }
  }
}
export function saveRecovery(account: string, value: CheckoutRecovery) {
  const serialized = JSON.stringify(recoverySchema.parse(value))
  window.sessionStorage.setItem(key(account), serialized)
  if (window.sessionStorage.getItem(key(account)) !== serialized)
    throw new Error(
      "Allow browser storage before continuing so your order can be recovered."
    )
  return value
}
export function clearRecovery(account: string) {
  if (typeof window === "undefined" || !account) return
  try {
    window.sessionStorage.removeItem(key(account))
  } catch {
    // Signing out must still work when the browser blocks storage.
  }
  try {
    window.localStorage.removeItem(key(account))
  } catch {
    // The former storage location may also be unavailable.
  }
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
  return saveRecovery(account, { ...current, command, issue: undefined })
}
export function noteCheckoutIssue(account: string, message: string) {
  const current = readRecovery(account)
  if (!current.command) return current
  return saveRecovery(account, {
    ...current,
    issue: message.slice(0, 300),
  })
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
