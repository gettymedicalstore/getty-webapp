import { z } from "zod"
import { apiData } from "@/lib/api/data"
import { GettyIdSchema } from "@/lib/api/getty-contract"

export const productRatingSchema = z.object({
  product: GettyIdSchema,
  item: GettyIdSchema,
  score: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  comment: z.string().trim().max(5000).optional(),
})

const submittedRatingSchema = z.object({ id: GettyIdSchema })

export type ProductRatingInput = z.infer<typeof productRatingSchema>

export async function submitProductRating(input: ProductRatingInput) {
  const body = productRatingSchema.parse(input)
  const data = await apiData<unknown>(
    "/getty/v1/product/ratings",
    {
      method: "POST",
      body: JSON.stringify({
        product: body.product,
        item: body.item,
        score: body.score,
        ...(body.title ? { title: body.title } : {}),
        ...(body.comment ? { comment: body.comment } : {}),
      }),
    },
    "authenticated"
  )
  return submittedRatingSchema.parse(data)
}
