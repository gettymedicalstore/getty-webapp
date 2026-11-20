"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { z } from "zod"
import { toast } from "sonner"
import {
  FormInput,
  FormSelect,
  FormTextarea,
  ValidatedForm,
} from "@/components/shared/form/validated-form"
import { Button } from "@/components/ui/button"
import { GettyApiError } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/query-keys"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { submitProductRating } from "../../api/product-ratings"

const formSchema = z.object({
  score: z.enum(["1", "2", "3", "4", "5"], {
    error: "Choose a rating.",
  }),
  title: z.string().trim().max(160),
  comment: z.string().trim().max(5000),
})

export default function RateProductDialog({
  product,
  item,
  name,
  onClose,
  onSubmitted,
  onEligibilityChanged,
}: {
  product: string
  item: string
  name: string
  onClose: () => void
  onSubmitted: () => void
  onEligibilityChanged: (status: number) => void
}) {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: submitProductRating,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["reviews", product] })
      void client.invalidateQueries({
        queryKey: queryKeys.products.details(),
      })
      toast.success("Your product review was submitted.")
      onSubmitted()
    },
    onError: (error) => {
      if (
        error instanceof GettyApiError &&
        (error.status === 404 || error.status === 409)
      ) {
        onEligibilityChanged(error.status)
      }
    },
  })

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>Rate {name}</DialogTitle>
        <DialogDescription>
          Share your experience with this item from your order.
        </DialogDescription>
        <ValidatedForm
          schema={formSchema}
          defaultValues={{ score: "", title: "", comment: "" }}
          onSubmit={(values) =>
            mutation.mutate({
              product,
              item,
              score: Number(values.score),
              title: values.title,
              comment: values.comment,
            })
          }
          className="space-y-5"
        >
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <div>
              <label
                htmlFor="product-rating-score"
                className="mb-2 block text-sm font-medium"
              >
                Rating
              </label>
              <FormSelect
                id="product-rating-score"
                name="score"
                className="form-input"
                required
              >
                <option value="">Select a rating</option>
                <option value="5">5 stars — Excellent</option>
                <option value="4">4 stars — Good</option>
                <option value="3">3 stars — Average</option>
                <option value="2">2 stars — Poor</option>
                <option value="1">1 star — Very poor</option>
              </FormSelect>
            </div>
            <div>
              <label
                htmlFor="product-rating-title"
                className="mb-2 block text-sm font-medium"
              >
                Review title (optional)
              </label>
              <FormInput
                id="product-rating-title"
                name="title"
                className="form-input"
                maxLength={160}
              />
            </div>
            <div>
              <label
                htmlFor="product-rating-comment"
                className="mb-2 block text-sm font-medium"
              >
                Your review (optional)
              </label>
              <FormTextarea
                id="product-rating-comment"
                name="comment"
                className="min-h-28"
                maxLength={5000}
              />
            </div>
          </fieldset>
          {mutation.isError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {mutation.error.message}
              {mutation.error instanceof GettyApiError &&
                mutation.error.status === 401 && (
                  <>
                    {" "}
                    <Link href="/login" className="font-medium underline">
                      Sign in again
                    </Link>
                  </>
                )}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit review"}
            </Button>
          </DialogFooter>
        </ValidatedForm>
      </DialogContent>
    </Dialog>
  )
}
