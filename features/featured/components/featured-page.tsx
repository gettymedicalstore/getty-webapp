"use client"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Search, Star } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"
import PageHeading from "@/components/shared/page-heading"
import ContentError from "@/components/shared/content-error"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import AdminDataTable from "@/components/admin/tables/admin-data-table"
import StatusBadge from "@/components/admin/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ValidatedForm,
  FormInput,
  FormSelect,
} from "@/components/shared/form/validated-form"
import {
  FormError,
  fieldClass,
} from "@/features/admin/components/product-workspace-shared"
import {
  deleteFeatured,
  featuredKeys,
  getFeaturedEntry,
  getFeaturedPage,
  saveFeatured,
} from "../api/featured"
import {
  featuredStatus,
  featuredStatuses,
  type Cursor,
  type FeaturedEntry,
  type FeaturedFormValues,
  type FeaturedStatus,
} from "../schema"
import FeaturedForm from "./featured-form"
import FeaturedImage from "./featured-image"
const filterSchema = z.object({
  search: z.string().trim(),
  status: z.enum(["", ...featuredStatuses]),
})
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
})
const dateLabel = (date: string) =>
  Number.isFinite(Date.parse(date))
    ? dateFormat.format(new Date(date))
    : "Not provided"

export default function FeaturedPage() {
  const client = useQueryClient()
  const router = useRouter()
  const [filters, setFilters] = useState<{
    search: string
    status: FeaturedStatus | ""
  }>({ search: "", status: "" })
  const [cursors, setCursors] = useState<Cursor[]>([0])
  const [dialog, setDialog] = useState<{
    kind: "edit" | "delete"
    entry?: FeaturedEntry
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [error, setError] = useState("")
  const [now, setNow] = useState(() => Date.now())
  const running = useRef(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const cancelDelete = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const query = useQuery({
    queryKey: ["featured", "management", filters, cursors.at(-1)],
    queryFn: () => getFeaturedPage({ ...filters, cursor: cursors.at(-1) }),
    refetchInterval: 60_000,
  })
  const detail = useQuery({
    queryKey: ["featured", "detail", dialog?.entry?.id],
    queryFn: () => getFeaturedEntry(dialog!.entry!.id),
    enabled: dialog?.kind === "edit",
    staleTime: 0,
  })
  function close() {
    if (!busy && !uploadBusy) {
      setDialog(null)
      setError("")
    }
  }
  async function mutate(action: () => Promise<void>, message: string) {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      await action()
      setDialog(null)
      setCursors([0])
      toast.success(message)
      await Promise.all([
        client.invalidateQueries({ queryKey: featuredKeys.all }),
        client.invalidateQueries({ queryKey: ["products", "featured"] }),
      ])
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your changes."
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  const columns: ColumnDef<FeaturedEntry, unknown>[] = [
    {
      id: "product",
      header: "Product / vendor",
      enableSorting: false,
      cell: ({ row: { original: entry } }) => (
        <div className="flex max-w-lg min-w-64 items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-[#e3e9e5] bg-[#f5f8f6]">
            <FeaturedImage
              key={`${entry.id}:${query.dataUpdatedAt}`}
              id={entry.id}
              name={entry.productName || entry.caption}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#283e31]">
              {entry.productName || "Featured product"}
            </p>
            {entry.vendorName && (
              <p className="mt-1 text-xs text-[#5e6f63]">{entry.vendorName}</p>
            )}
            <p className="mt-2 text-sm leading-5 text-[#5e6f63]">
              {entry.caption}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "schedule",
      header: "Schedule · Africa/Lagos",
      enableSorting: false,
      cell: ({ row: { original: entry } }) => (
        <div className="min-w-44 space-y-1 text-xs">
          <p>From {dateLabel(entry.starts)}</p>
          <p>Until {dateLabel(entry.ends)}</p>
          <p className="pt-1 text-[#5e6f63]">Display order: {entry.ordinal}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge status={featuredStatus(row.original, now)} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            onClick={(event) => {
              trigger.current = event.currentTarget
              setError("")
              setDialog({ kind: "edit", entry: row.original })
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-red-700 hover:text-red-800"
            onClick={(event) => {
              trigger.current = event.currentTarget
              setError("")
              setDialog({ kind: "delete", entry: row.original })
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]
  return (
    <div className="space-y-6">
      <PageHeading
        title="Featured products"
        description="Choose the products and images customers see first."
        action={
          <Button
            className="h-12 text-sm"
            onClick={() => router.push("/admin/featured/new")}
          >
            <Plus aria-hidden className="size-4" />
            Add featured product
          </Button>
        }
      />
      <ValidatedForm
        schema={filterSchema}
        defaultValues={filters}
        autoSubmit={300}
        onSubmit={(values) => {
          if (
            values.search !== filters.search ||
            values.status !== filters.status
          ) {
            setFilters(values)
            setCursors([0])
          }
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-4 left-3 size-4 text-[#687b6e]"
          />
          <FormInput
            name="search"
            type="search"
            aria-label="Search featured products"
            placeholder="Search product, vendor or caption"
            className={`${fieldClass} pl-10`}
          />
        </div>
        <FormSelect
          name="status"
          aria-label="Filter featured products by status"
          className={fieldClass}
          containerClassName="sm:w-48"
        >
          <option value="">All statuses</option>
          {featuredStatuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </FormSelect>
      </ValidatedForm>
      {query.isPending ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ContentError
          title="We couldn’t load featured products"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <AdminDataTable
          label="Featured products"
          data={query.data.records}
          columns={columns}
          total={query.data.records.length}
          pageCount={1}
          pagination={{ pageIndex: 0, pageSize: 20 }}
          onPaginationChange={() => {}}
          emptyState={
            <div className="mx-auto max-w-sm">
              <Star
                aria-hidden
                className="mx-auto mb-3 size-7 text-[#58735f]"
              />
              <p className="font-semibold">
                {filters.search || filters.status
                  ? "No matching featured products"
                  : "No featured products yet"}
              </p>
              <p className="mt-2 text-sm">
                {filters.search || filters.status
                  ? "Try another search or status."
                  : "Add a product, upload its advert image and choose when it appears."}
              </p>
            </div>
          }
          paginationControls={
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#5e6f63]">
                {query.data.records.length} featured products on this page
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={cursors.length <= 1 || query.isFetching}
                  onClick={() => setCursors((value) => value.slice(0, -1))}
                >
                  Previous
                </Button>
                <span className="px-1 text-xs">Page {cursors.length}</span>
                <Button
                  variant="outline"
                  disabled={!query.data.isNext || query.isFetching}
                  onClick={() => {
                    if (query.data.nextCursor !== null)
                      setCursors((value) => [...value, query.data.nextCursor!])
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          }
        />
      )}
      <p className="text-xs leading-5 text-[#5e6f63]">
        Times shown in Africa/Lagos. Expired entries remain in history.
      </p>
      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <DialogContent
          className={dialog?.kind === "delete" ? "sm:max-w-lg" : "sm:max-w-2xl"}
          showCloseButton={!busy && !uploadBusy}
          initialFocus={dialog?.kind === "delete" ? cancelDelete : undefined}
          finalFocus={() => trigger.current}
        >
          <DialogTitle>
            {dialog?.kind === "delete"
              ? "Delete featured product?"
              : "Edit featured product"}
          </DialogTitle>
          <DialogDescription>
            {dialog?.kind === "delete"
              ? "This removes the advert and its dedicated image. The product stays in the catalogue."
              : "Choose a published product, advert image and schedule for the storefront."}
          </DialogDescription>
          {dialog?.kind === "delete" ? (
            <>
              <FormError message={error} />
              <DialogFooter>
                <Button
                  ref={cancelDelete}
                  variant="outline"
                  disabled={busy}
                  onClick={close}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      () => deleteFeatured(dialog.entry!.id),
                      "Featured product deleted."
                    )
                  }
                >
                  {busy ? "Deleting…" : "Delete featured product"}
                </Button>
              </DialogFooter>
            </>
          ) : dialog?.kind === "edit" &&
            (detail.isPending || detail.isError) ? (
            detail.isError ? (
              <ContentError
                title="We couldn’t load this featured product"
                onRetry={() => void detail.refetch()}
                retrying={detail.isFetching}
              />
            ) : (
              <p role="status">Loading featured product…</p>
            )
          ) : (
            dialog && (
              <FeaturedForm
                key={dialog.entry?.id}
                entry={detail.data}
                busy={busy}
                error={error}
                onUploadBusy={setUploadBusy}
                onCancel={close}
                onSave={(values: FeaturedFormValues) =>
                  mutate(
                    () => saveFeatured(values, dialog.entry!.id),
                    "Featured product updated."
                  )
                }
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
