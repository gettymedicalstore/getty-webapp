import type { InternalAxiosRequestConfig } from "axios"
import {
  syncSession,
  type SessionSnapshot,
} from "@/features/auth/api/session-store"
import {
  currentSession,
  refreshSession,
  waitForRefresh,
} from "@/features/auth/api/refresh-session"
import {
  createGettyClient,
  gettyRequestConfig,
  gettyResponse,
  gettyTransportError,
  unwrapGettyResponse,
} from "./transport"
import { GettyApiError } from "./errors"
export { GettyApiError } from "./errors"

export type ApiAccess = "authenticated" | "public" | "anonymous"
type GettyConfig = InternalAxiosRequestConfig & {
  getty?: {
    access: ApiAccess
    session?: SessionSnapshot | null
    retried?: boolean
  }
}

export const gettyClient = createGettyClient()
gettyClient.interceptors.request.use((config: GettyConfig) => {
  const meta = config.getty ?? { access: "authenticated" as const }
  const session =
    meta.access !== "authenticated"
      ? null
      : meta.session?.sessionId
        ? currentSession(meta.session)
        : syncSession()
  if (meta.access === "authenticated" && !session?.user)
    throw new GettyApiError("Please log in to continue.", 401)
  config.headers.delete("Authorization")
  if (session?.accessToken)
    config.headers.set("Authorization", `Bearer ${session.accessToken}`)
  if (meta.access === "public") config.withCredentials = false
  config.getty = { ...meta, session }
  return config
})

gettyClient.interceptors.response.use(async (response) => {
  const config = response.config as GettyConfig
  const meta = config.getty
  const session = meta?.session
  if (session?.sessionId) currentSession(session)
  const result = gettyResponse(response)
  const stream =
    typeof ReadableStream !== "undefined" &&
    config.data instanceof ReadableStream
  const authEndpoint = new URL(config.url!).pathname.startsWith("/auth/getty/")
  if (
    result.status === 401 &&
    session?.sessionId &&
    !meta?.retried &&
    !stream &&
    !authEndpoint
  ) {
    const signal = config.signal as AbortSignal | undefined
    signal?.throwIfAborted()
    // Mark every failed request before it joins the shared refresh promise.
    // A replay that also returns 401 must never enter another refresh loop.
    config.getty = {
      ...meta,
      access: meta?.access ?? "authenticated",
      retried: true,
    }
    await waitForRefresh(refreshSession(session), signal)
    signal?.throwIfAborted()
    currentSession(session)
    return gettyClient.request(config)
  }
  unwrapGettyResponse(result)
  return response
})

// Keep the existing application API while all network calls use Axios.
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  access: ApiAccess = "authenticated"
): Promise<T> {
  const session = access === "authenticated" ? syncSession() : null
  if (access === "authenticated" && !session?.user)
    throw new GettyApiError("Please log in to continue.", 401)
  const config = {
    ...gettyRequestConfig(path, options),
    getty: { access, session },
  }
  options.signal?.throwIfAborted()
  try {
    const response = await gettyClient.request(config)
    return unwrapGettyResponse<T>(gettyResponse(response))
  } catch (error) {
    return gettyTransportError(error, options.signal)
  }
}

export function unavailable(message: string): never {
  throw new GettyApiError(message, 501)
}
