"use client"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

type AdminTablePaginationProps = {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export default function AdminTablePagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: AdminTablePaginationProps) {
  const currentPage = Math.min(page + 1, Math.max(pageCount, 1))
  const first = total === 0 ? 0 : page * pageSize + 1
  const last = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex flex-col justify-between gap-3 border-t p-4 text-sm sm:flex-row sm:items-center">
      <p className="text-muted-foreground">
        Showing {first}–{last} of {total}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="bg-background h-9 rounded-md border px-2 text-sm"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}

        <span className="text-muted-foreground px-2">
          Page {currentPage} of {Math.max(pageCount, 1)}
        </span>

        <PaginationButton
          label="First page"
          disabled={page <= 0}
          onClick={() => onPageChange(0)}
        >
          <ChevronsLeft className="size-4" />
        </PaginationButton>

        <PaginationButton
          label="Previous page"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </PaginationButton>

        <PaginationButton
          label="Next page"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </PaginationButton>

        <PaginationButton
          label="Last page"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(pageCount - 1)}
        >
          <ChevronsRight className="size-4" />
        </PaginationButton>
      </div>
    </div>
  )
}

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
