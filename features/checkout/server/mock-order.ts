export const MOCK_ORDER_COOKIE = "mock-pending-order"

export type MockOrderItem = {
  productId: string
  quantity: number
}

export type MockPaymentMode =
  | {
      type: "full"
    }
  | {
      type: "installment"
      frequency: "weekly" | "monthly"
      installmentCount: number
    }

export type MockOrder = {
  id: string
  customerId: string
  customerEmail: string
  items: MockOrderItem[]
  paymentMode: MockPaymentMode
  subtotalKobo: number
  deliveryFeeKobo: number
  totalKobo: number
  amountDueKobo: number
  paymentReference: string | null
  status: "pending" | "paid" | "failed"
  createdAt: string
  paidAt: string | null
}

export function encodeMockOrder(order: MockOrder) {
  return Buffer.from(JSON.stringify(order), "utf8").toString("base64url")
}

export function decodeMockOrder(value: string | undefined): MockOrder | null {
  if (!value) {
    return null
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8")

    const parsed: unknown = JSON.parse(decoded)

    return isMockOrder(parsed) ? parsed : null
  } catch (error) {
    console.error("Unable to decode mock order:", error)
    return null
  }
}

function isMockOrder(value: unknown): value is MockOrder {
  if (!isRecord(value)) {
    return false
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.customerId) &&
    isNonEmptyString(value.customerEmail) &&
    isValidOrderItems(value.items) &&
    isMockPaymentMode(value.paymentMode) &&
    isNonNegativeInteger(value.subtotalKobo) &&
    isNonNegativeInteger(value.deliveryFeeKobo) &&
    isPositiveInteger(value.totalKobo) &&
    isPositiveInteger(value.amountDueKobo) &&
    (value.paymentReference === null ||
      isNonEmptyString(value.paymentReference)) &&
    (value.status === "pending" ||
      value.status === "paid" ||
      value.status === "failed") &&
    isValidDateString(value.createdAt) &&
    (value.paidAt === null || isValidDateString(value.paidAt))
  )
}

function isValidOrderItems(value: unknown): value is MockOrderItem[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => {
      if (!isRecord(item)) {
        return false
      }

      return (
        isNonEmptyString(item.productId) && isPositiveInteger(item.quantity)
      )
    })
  )
}

function isMockPaymentMode(value: unknown): value is MockPaymentMode {
  if (!isRecord(value)) {
    return false
  }

  if (value.type === "full") {
    return true
  }

  return (
    value.type === "installment" &&
    (value.frequency === "weekly" || value.frequency === "monthly") &&
    isPositiveInteger(value.installmentCount) &&
    value.installmentCount > 1
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isValidDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  )
}
