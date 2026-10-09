"use client"
import { LoadingRegion } from "@/components/shared/loading-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiData as apiRequest } from "@/lib/api/data"
import type { RatingPage } from "@/lib/api/getty-contract"
export default function ProductReviews({ product }: { product: string }) {
  const [page, setPage] = useState({ cursor: 0, navigation: "next" })
  const query = useQuery({
    queryKey: ["reviews", product, page],
    queryFn: () =>
      apiRequest<RatingPage>(
        `/getty/ecommerce/catalog/products/${product}/ratings?cursor=${page.cursor}&navigation=${page.navigation}`,
        {},
        "public"
      ),
  })
  return (
    <section className="mt-6 rounded-xl bg-white p-5">
      <h2 className="text-lg font-semibold">Verified purchase reviews</h2>
      {query.isPending ? (
        <LoadingRegion label="Loading reviews" className="mt-6 space-y-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </LoadingRegion>
      ) : query.isError ? (
        <button
          className="mt-4 text-sm underline"
          onClick={() => void query.refetch()}
        >
          Reviews could not be loaded. Try again.
        </button>
      ) : (
        <>
          {query.data.records.length === 0 && (
            <p className="mt-4 text-sm text-[#535862]">
              No published reviews yet.
            </p>
          )}
          <div className="divide-y">
            {query.data.records.map((r) => (
              <article key={r.id} className="py-4">
                <p className="text-sm font-medium">
                  {r.score}/5 · Verified purchase ·{" "}
                  {new Date(r.date).toLocaleDateString("en-NG")}
                </p>
                {r.title && <h3 className="mt-2 font-medium">{r.title}</h3>}
                {r.comment && (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-[#535862]">
                    {r.comment}
                  </p>
                )}
              </article>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              disabled={!query.data.isPrevious}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              onClick={() =>
                setPage({
                  cursor: query.data.previousCursor,
                  navigation: "previous",
                })
              }
            >
              Previous
            </button>
            <button
              disabled={!query.data.isNext}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              onClick={() =>
                setPage({ cursor: query.data.nextCursor, navigation: "next" })
              }
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  )
}
