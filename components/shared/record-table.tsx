"use client"
import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import AdminDataTable from "@/components/admin/tables/admin-data-table"
import { ValidatedForm, FormInput } from "./form/validated-form"
import { searchSchema } from "@/lib/form-schemas"
import { Search, ListFilter, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
export type DisplayRecord = { id: string; [key: string]: unknown }
export default function RecordTable({
  records,
  columns,
  title,
  actions,
  emptyDescription,
}: {
  records: DisplayRecord[]
  columns: { key: string; label: string }[]
  title: string
  actions?: (record: DisplayRecord) => React.ReactNode
  emptyDescription?: string
}) {
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const filtered = useMemo(
    () =>
      records.filter((record) =>
        columns.some((c) =>
          String(record[c.key] ?? "")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      ),
    [records, columns, search]
  )
  const pageIndex = Math.min(
    pagination.pageIndex,
    Math.max(0, Math.ceil(filtered.length / pagination.pageSize) - 1)
  )
  const definitions: ColumnDef<DisplayRecord, unknown>[] = columns.map((c) => ({
    accessorKey: c.key,
    header: c.label,
    enableSorting: false,
    cell: ({ getValue }) =>
      c.key === "status" && getValue() ? (
        <RecordStatus value={String(getValue())} />
      ) : (
        <span className="block max-w-80 break-words">
          {String(getValue() ?? "—")}
        </span>
      ),
  }))
  if (actions)
    definitions.push({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => actions(row.original),
    })
  return (
    <section className="min-w-0" aria-label={title}>
      <AdminDataTable
        label={title}
        toolbar={
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <ValidatedForm
              schema={searchSchema}
              autoSubmit={0}
              onSubmit={({ search }) => {
                setSearch(search)
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              className="relative w-full sm:max-w-xs"
            >
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-[#839088]"
              />
              <FormInput
                name="search"
                aria-label={`Search ${title} in this view`}
                type="search"
                placeholder={`Search ${title.toLowerCase()}…`}
                className="h-11 rounded-lg border-[#e2e8e3] pl-9 text-base shadow-none sm:text-sm"
              />
            </ValidatedForm>
            <p
              role="status"
              className="flex shrink-0 items-center gap-2 text-xs text-[#68776d]"
            >
              <ListFilter aria-hidden className="size-3.5" />
              {filtered.length} {filtered.length === 1 ? "record" : "records"}{" "}
              in this view
            </p>
          </div>
        }
        columns={definitions}
        data={filtered.slice(
          pageIndex * pagination.pageSize,
          (pageIndex + 1) * pagination.pageSize
        )}
        total={filtered.length}
        pageCount={Math.max(
          1,
          Math.ceil(filtered.length / pagination.pageSize)
        )}
        pagination={{ ...pagination, pageIndex }}
        onPaginationChange={setPagination}
        emptyState={
          <div className="mx-auto flex max-w-xs flex-col items-center px-4">
            <Inbox
              aria-hidden
              className="mb-4 size-7 text-[#a2afa5]"
              strokeWidth={1.5}
            />
            <p className="font-medium text-[#3e5144]">
              {search ? "No matching records" : `No ${title.toLowerCase()} yet`}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#68776d]">
              {search
                ? "Try a different name or clear your search."
                : (emptyDescription ??
                  `Your ${title.toLowerCase()} will appear here when available.`)}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-primary mt-3 min-h-11 text-xs font-semibold hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        }
      />
    </section>
  )
}

function RecordStatus({ value }: { value: string }) {
  const status = value.toLowerCase()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium whitespace-nowrap capitalize",
        [
          "active",
          "verified",
          "approved",
          "paid",
          "completed",
          "delivered",
        ].includes(status)
          ? "border-[#dceade] bg-[#f2f8ef] text-[#4d7854]"
          : ["pending", "processing", "draft", "unverified"].includes(status)
            ? "border-[#f0e4c7] bg-[#fffbef] text-[#856020]"
            : ["failed", "rejected", "cancelled", "inactive"].includes(status)
              ? "border-[#f0ddda] bg-[#fff6f4] text-[#9a4c42]"
              : "border-[#e4e9e6] bg-[#f6f8f7] text-[#5e6f63]"
      )}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {value}
    </span>
  )
}
