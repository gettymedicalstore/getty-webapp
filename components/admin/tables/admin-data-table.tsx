"use client"

import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import type { ReactNode } from "react"

import AdminTablePagination from "./admin-table-pagination"
import { Skeleton } from "@/components/ui/skeleton"

type AdminDataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  total: number
  pageCount: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  loading?: boolean
  emptyState?: ReactNode
  toolbar?: ReactNode
  label?: string
  paginationControls?: ReactNode
}

export default function AdminDataTable<TData>({
  columns,
  data,
  total,
  pageCount,
  pagination,
  onPaginationChange,
  sorting = [],
  onSortingChange,
  loading = false,
  emptyState,
  toolbar,
  label = "Records",
  paginationControls,
}: AdminDataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
    },
    manualPagination: true,
    manualSorting: Boolean(onSortingChange),
    onPaginationChange,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-xl border border-[#e3e8e5] bg-white shadow-[0_2px_4px_rgba(25,45,32,.02)]">
      {toolbar}
      <div
        className="overflow-x-auto overscroll-x-contain"
        role="region"
        aria-label={`${label} table`}
        tabIndex={0}
      >
        <table
          className="w-full border-collapse"
          style={{
            minWidth: columns.length > 4 ? 760 : columns.length > 3 ? 640 : 480,
          }}
        >
          <caption className="sr-only">{label}</caption>
          <thead className="bg-[#f8faf9]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sortable
                          ? sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : "none"
                          : undefined
                      }
                      className="border-y border-[#e9edea] px-5 py-3.5 text-left text-xs font-medium whitespace-nowrap text-[#5e6f63]"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!sortable}
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-2 disabled:cursor-default"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}

                          {sortable &&
                            (sorted === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ChevronsUpDown className="size-3.5" />
                            ))}
                        </button>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: pagination.pageSize }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={columns.length} className="border-b px-4 py-4">
                    <Skeleton className="h-5" />
                  </td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-[#fafcf9]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-b border-[#eff2ef] px-5 py-4 text-[13px] text-[#5d6a61] first:font-medium first:text-[#293c30]"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-muted-foreground px-4 py-14 text-center text-sm"
                >
                  {emptyState ?? "No records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginationControls ??
        (total > 0 && (
          <AdminTablePagination
            page={pagination.pageIndex}
            pageSize={pagination.pageSize}
            pageCount={pageCount}
            total={total}
            onPageChange={(pageIndex) => {
              onPaginationChange((current) => ({
                ...current,
                pageIndex,
              }))
            }}
            onPageSizeChange={(pageSize) => {
              onPaginationChange({
                pageIndex: 0,
                pageSize,
              })
            }}
          />
        ))}
    </div>
  )
}
