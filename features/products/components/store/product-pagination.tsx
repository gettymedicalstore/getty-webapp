"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { ProductPagination as Pagination } from "../../types/product"

export default function ProductPagination({
  pagination,
}: {
  pagination: Pagination
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(page: number) {
    const params = new URLSearchParams(searchParams.toString())

    params.set("page", String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (pagination.totalPages <= 1) {
    return null
  }

  return (
    <div className="mt-10 flex items-center justify-between border-t border-black/5 pt-6">
      <p className="text-xs text-black/45">
        Page {pagination.page} of {pagination.totalPages}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!pagination.hasPreviousPage}
          onClick={() => navigate(pagination.page - 1)}
          className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="size-4" />
          Previous
        </button>

        <button
          type="button"
          disabled={!pagination.hasNextPage}
          onClick={() => navigate(pagination.page + 1)}
          className="bg-primary flex h-10 items-center gap-2 rounded-md px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
