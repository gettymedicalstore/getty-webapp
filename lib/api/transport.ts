import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import { GETTY_API_BASE_URL, gettyUrl } from "./config"
import { GettyApiError } from "./errors"

export function createGettyClient() {
  const client = axios.create({
    baseURL: GETTY_API_BASE_URL,
    timeout: 15000,
    withCredentials: true,
    headers: { Accept: "application/json" },
    responseType: "text",
    // Preserve raw JSON so empty/malformed responses retain Getty's error semantics.
    transformResponse: [(data: unknown) => data],
    // The interceptor also handles API errors inside a successful HTTP envelope.
    validateStatus: () => true,
  })
  client.interceptors.request.use((config) => {
    const url = new URL(config.url ?? "", `${GETTY_API_BASE_URL}/`)
    if (url.origin !== new URL(GETTY_API_BASE_URL).origin)
      throw new GettyApiError("Invalid Getty API origin.", 400)
    config.url = gettyUrl(`${url.pathname}${url.search}`)
    return config
  })
  return client
}

// Refresh/logout bypass the resource interceptor, preventing recursive renewal.
export const gettyAuthClient = createGettyClient()

export function gettyRequestConfig(
  path: string,
  options: RequestInit = {},
  token: string | null = null
): AxiosRequestConfig {
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")
  if (typeof options.body === "string" && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json")
  headers.delete("Authorization")
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return {
    url: gettyUrl(path),
    method: options.method ?? "GET",
    headers: Object.fromEntries(headers.entries()),
    data: options.body,
    signal: options.signal ?? undefined,
  }
}

export function gettyResponse(response: AxiosResponse) {
  let body = response.data
  if (response.status === 204) body = {}
  else if (typeof body === "string") {
    try {
      body = JSON.parse(body)
    } catch {
      body = null
    }
  }
  if (body === undefined) body = null
  const errorStatus =
    Number.isInteger(body?.status) && body.status >= 400 && body.status <= 599
  const ok = response.status >= 200 && response.status < 300
  const status = ok
    ? errorStatus
      ? body.status
      : body?.success === false
        ? 502
        : response.status
    : response.status
  const emptyBody =
    response.status === 204 ||
    response.data === "" ||
    response.data === undefined
  return { body, status, emptyBody }
}

export function gettyTransportError(
  error: unknown,
  signal?: AbortSignal | null
): never {
  if (signal?.aborted) throw signal.reason
  if (error instanceof GettyApiError) throw error
  if (axios.isCancel(error)) throw error
  if (!axios.isAxiosError(error) && !(error instanceof TypeError)) throw error
  throw new GettyApiError(
    "The Getty service could not be reached. Please try again.",
    503
  )
}

export async function sendGettyRequest(
  path: string,
  options: RequestInit = {},
  token: string | null = null
) {
  const config = gettyRequestConfig(path, options, token)
  try {
    return gettyResponse(await gettyAuthClient.request(config))
  } catch (error) {
    return gettyTransportError(error, options.signal)
  }
}

export function unwrapGettyResponse<T>({
  body,
  status,
}: ReturnType<typeof gettyResponse>): T {
  if (status < 200 || status >= 300) {
    const decision = body?.data
    const message =
      typeof decision?.message === "string" &&
      ["REVIEW", "BLOCK"].includes(decision.decision)
        ? decision.message
        : typeof body?.message === "string"
          ? body.message
          : typeof body?.error === "string"
            ? body.error
            : "The request could not be completed."
    throw new GettyApiError(message, status, decision)
  }
  if (body === null)
    throw new GettyApiError(
      "The Getty service returned an incomplete response."
    )
  return body as T
}
