import { apiRequest, GettyApiError } from "@/lib/api/client"
import {
  InventoryPageResponseSchema,
  StockPageResponseSchema,
  InventoryMutationResponseSchema,
} from "@/lib/api/getty-contract"
export async function inventoryRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const result = await apiRequest(path, options)
  const schema =
    options.method && options.method !== "GET"
      ? InventoryMutationResponseSchema
      : path.split("?")[0].endsWith("/variants")
        ? InventoryPageResponseSchema
        : StockPageResponseSchema
  const parsed = schema.safeParse(result)
  if (!parsed.success)
    throw new GettyApiError(
      "The inventory response is incomplete. Please retry with the same request."
    )
  return parsed.data.data as T
}
