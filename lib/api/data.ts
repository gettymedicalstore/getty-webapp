import { apiRequest, GettyApiError, type ApiAccess } from "./client"
export async function apiData<T>(
  path: string,
  options: RequestInit = {},
  access: ApiAccess = "authenticated"
): Promise<T> {
  const result = await apiRequest<{ data: T }>(path, options, access)
  if (result.data === undefined)
    throw new GettyApiError(
      "The Getty service returned an incomplete response."
    )
  return result.data
}
