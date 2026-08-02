type InitializePaymentInput = {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}

type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export type VerifiedPaystackTransaction = {
  id: number
  status: string
  reference: string
  amount: number
  currency: string
  paid_at?: string | null
  customer?: {
    email?: string
  }
  metadata?: unknown
}

type PaystackVerifyResponse = {
  status: boolean
  message: string
  data?: VerifiedPaystackTransaction
}

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.")
  }

  return secretKey
}

export async function initializePaystackPayment(input: InitializePaymentInput) {
  const response = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
      cache: "no-store",
    }
  )

  const result = (await response.json()) as PaystackInitializeResponse

  if (!response.ok || !result.status || !result.data?.authorization_url) {
    throw new Error(
      result.message || "Paystack payment could not be initialized."
    )
  }

  return {
    authorizationUrl: result.data.authorization_url,
    accessCode: result.data.access_code,
    reference: result.data.reference,
  }
}

export async function verifyPaystackPayment(reference: string) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(
      reference
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  const result = (await response.json()) as PaystackVerifyResponse

  if (!response.ok || !result.status || !result.data) {
    throw new Error(result.message || "Paystack payment verification failed.")
  }

  return result.data
}

export function parsePaystackMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value)

      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }

  return {}
}
