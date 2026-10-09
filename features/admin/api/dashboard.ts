import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { GettyApiError } from "@/lib/api/client"

const count = z.number().int().nonnegative()
export const adminDashboardSchema = z.object({
  totalAccounts: count,
  customers: count,
  vendors: count,
  totalProducts: count,
  totalCategories: count,
  pendingProductReviews: count,
  orderTrend: z
    .array(
      z.object({
        month: z.string().regex(/^\d{2}-(0[1-9]|1[0-2])$/),
        value: count,
      })
    )
    .refine(
      (items) => new Set(items.map((item) => item.month)).size === items.length
    ),
  // The dashboard contract supplies empty arrays; retain item fields until
  // populated examples establish a stricter attention-item contract.
  recentOrdersAwaitingAttention: z.array(z.record(z.string(), z.unknown())),
  recentProductsAwaitingApproval: z.array(z.record(z.string(), z.unknown())),
})

export type AdminDashboardData = z.infer<typeof adminDashboardSchema>

export async function getAdminDashboard(
  signal?: AbortSignal
): Promise<AdminDashboardData> {
  const response = await apiData<unknown>("/getty/v1/dashboard", { signal })
  const parsed = adminDashboardSchema.safeParse(response)
  if (!parsed.success)
    throw new GettyApiError("The dashboard response is incomplete.", 502)
  return {
    ...parsed.data,
    orderTrend: [...parsed.data.orderTrend].sort((a, b) =>
      a.month.localeCompare(b.month)
    ),
  }
}
