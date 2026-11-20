"use client"
import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import AdminDataTable from "@/components/admin/tables/admin-data-table"
import { ValidatedForm, FormInput } from "./form/validated-form"
import { searchSchema } from "@/lib/form-schemas"
import { Search, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
export type DisplayRecord = { id: string; [key: string]: unknown }
export default function RecordTable({
  records,
  columns,
  title,
  actions,
  emptyDescription,
  serverSearch,
  loading = false,
}: {
  records: DisplayRecord[]
  columns: { key: string; label: string }[]
  title: string
  actions?: (record: DisplayRecord) => React.ReactNode
  emptyDescription?: string
  serverSearch?: { value: string; onChange: (value: string) => void }
  loading?: boolean
}) {
  const [search, setSearch] = useState("")
  const [searchResetKey, setSearchResetKey] = useState(0)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const filtered = useMemo(
    () =>
      serverSearch
        ? records
        : records.filter((record) =>
            columns.some((c) =>
              String(record[c.key] ?? "")
                .toLowerCase()
                .includes(search.toLowerCase())
            )
          ),
    [records, columns, search, serverSearch]
  )
  const activeSearch = serverSearch?.value ?? search
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
          <div className="p-4 sm:px-5">
            <ValidatedForm
              key={serverSearch ? undefined : searchResetKey}
              schema={searchSchema}
              autoSubmit={serverSearch ? 350 : 0}
              defaultValues={{ search: activeSearch }}
              values={serverSearch ? { search: serverSearch.value } : undefined}
              onSubmit={({ search }) => {
                if (serverSearch) {
                  if (search !== serverSearch.value)
                    serverSearch.onChange(search)
                } else setSearch(search)
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              role="search"
              className="relative w-full sm:max-w-sm"
            >
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-[#839088]"
              />
              <FormInput
                name="search"
                aria-label={
                  serverSearch
                    ? `Search ${title}`
                    : `Search ${title} in this view`
                }
                type="search"
                placeholder={`Search ${title.toLowerCase()}…`}
                className="h-11 w-full rounded-lg border border-[#dfe7e1] bg-white pr-3 pl-10 text-base text-[#263e30] shadow-none outline-none placeholder:text-[#8b988f] focus-visible:border-[#1b5442] focus-visible:ring-2 focus-visible:ring-[#d7e8dc] sm:text-sm"
              />
            </ValidatedForm>
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
        loading={loading}
        emptyState={
          <div className="mx-auto flex max-w-xs flex-col items-center px-4">
            <Inbox
              aria-hidden
              className="mb-4 size-7 text-[#a2afa5]"
              strokeWidth={1.5}
            />
            <p className="font-medium text-[#3e5144]">
              {activeSearch
                ? "No matching records"
                : `No ${title.toLowerCase()} yet`}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#68776d]">
              {activeSearch
                ? "Try a different name or clear your search."
                : (emptyDescription ??
                  `Your ${title.toLowerCase()} will appear here when available.`)}
            </p>
            {activeSearch && (
              <button
                type="button"
                onClick={() => {
                  if (serverSearch) serverSearch.onChange("")
                  else {
                    setSearch("")
                    setSearchResetKey((current) => current + 1)
                  }
                }}
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
