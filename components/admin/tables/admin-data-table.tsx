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
    <div className="bg-background overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="bg-muted/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <th
                      key={header.id}
                      className="text-muted-foreground border-b px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase"
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
                    <div className="bg-muted h-5 animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b px-4 py-3 text-sm">
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
    </div>
  )
}
