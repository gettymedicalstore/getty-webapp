const key = (scope: string) => `getty.order-action.v1:${scope}`
export function pendingOrderAction(
  scope: string
): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(key(scope))
  if (!raw) return null
  const saved = JSON.parse(raw) as {
    signature: string
    body: Record<string, unknown>
  }
  if (!saved.body || typeof saved.body.token !== "string")
    throw new Error(
      "The saved action could not be recovered. Refresh the order and contact support before repeating it."
    )
  const payload = { ...saved.body }
  delete payload.token
  if (JSON.stringify(payload) !== saved.signature)
    throw new Error(
      "The saved action could not be verified. Refresh the order before continuing."
    )
  return saved.body
}
/** Persist the exact request before sending; an uncertain request cannot be replaced. */
export function prepareOrderAction<T extends Record<string, unknown>>(
  scope: string,
  payload: T
): T & { token: string } {
  const signature = JSON.stringify(payload)
  const previous = pendingOrderAction(scope)
  if (previous) {
    const oldPayload = { ...previous }
    delete oldPayload.token
    if (JSON.stringify(oldPayload) !== signature)
      throw new Error(
        "An earlier action is awaiting confirmation. Retry its original values before making another change."
      )
    return previous as T & { token: string }
  }
  const body = { ...payload, token: crypto.randomUUID() }
  const serialized = JSON.stringify({ signature, body })
  window.localStorage.setItem(key(scope), serialized)
  if (window.localStorage.getItem(key(scope)) !== serialized)
    throw new Error(
      "Allow browser storage so the action can be safely recovered."
    )
  return body
}
export function clearOrderAction(scope: string) {
  window.localStorage.removeItem(key(scope))
}
