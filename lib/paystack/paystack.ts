import type {
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  PaymentFrequency,
} from "@/features/checkout/types/payment"

const PAYSTACK_BASE_URL = "https://api.paystack.co"

function getSecretKey(): string {
  const secretKey = process.env.PAYSTACK_SECRET_KEY

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.")
  }

  return secretKey
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  })

  const result = (await response.json()) as {
    status?: boolean
    message?: string
  }

  if (!response.ok || !result.status) {
    throw new Error(
      result.message ?? "Paystack request could not be completed."
    )
  }

  return result as T
}

type InitializeTransactionInput = {
  email: string
  amountKobo?: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
  planCode?: string
  invoiceLimit?: number
}

export async function initializePaystackTransaction({
  email,
  amountKobo,
  reference,
  callbackUrl,
  metadata,
  planCode,
  invoiceLimit,
}: InitializeTransactionInput) {
  const body: Record<string, unknown> = {
    email,
    currency: "NGN",
    reference,
    callback_url: callbackUrl,
    metadata: JSON.stringify(metadata),
  }

  if (planCode) {
    body.plan = planCode
    body.invoice_limit = invoiceLimit
    body.channels = ["card"]
  } else {
    body.amount = String(amountKobo)
  }

  return paystackRequest<PaystackInitializeResponse>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

type CreatePlanInput = {
  orderId: string
  amountKobo: number
  interval: PaymentFrequency
  invoiceLimit: number
}

type CreatePlanResponse = {
  status: boolean
  message: string
  data: {
    id: number
    name: string
    plan_code: string
    amount: number
    interval: PaymentFrequency
    invoice_limit: number
    currency: string
  }
}

export async function createPaystackPlan({
  orderId,
  amountKobo,
  interval,
  invoiceLimit,
}: CreatePlanInput) {
  return paystackRequest<CreatePlanResponse>("/plan", {
    method: "POST",
    body: JSON.stringify({
      name: `Getty order ${orderId}`,
      description: `Instalment payment for order ${orderId}`,
      amount: amountKobo,
      interval,
      invoice_limit: invoiceLimit,
      currency: "NGN",
      send_invoices: true,
      send_sms: false,
    }),
  })
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
    }
  )
}
