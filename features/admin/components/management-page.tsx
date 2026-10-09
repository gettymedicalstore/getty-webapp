"use client"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import {
  productFormSchema,
  categoryFormSchema,
  taxFormSchema,
} from "@/lib/form-schemas"
import type { BaseSyntheticEvent } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import PageHeading from "@/components/shared/page-heading"
import RecordTable, {
  type DisplayRecord,
} from "@/components/shared/record-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { portalRecords, changePortalRecord } from "../api/portal"
import CreateAccount from "./create-account"
import OrderDashboardSummary from "@/features/orders/components/order-dashboard-summary"
import RecordRowActions from "./record-row-actions"
const screens: Record<
  string,
  {
    title: string
    description: string
    columns: { key: string; label: string }[]
  }
> = {
  products: {
    title: "Products",
    description: "Manage your catalogue and product information.",
    columns: [
      { key: "name", label: "Product" },
      { key: "category", label: "Category" },
      { key: "price", label: "Price (NGN)" },
      { key: "quantity", label: "Stock" },
      { key: "status", label: "Status" },
    ],
  },
  inventory: {
    title: "Inventory",
    description: "Review current product availability.",
    columns: [
      { key: "name", label: "Product" },
      { key: "availableQuantity", label: "Available" },
      { key: "quantity", label: "Quantity" },
      { key: "status", label: "Status" },
    ],
  },
  categories: {
    title: "Categories",
    description: "Organize medical supplies into categories.",
    columns: [
      { key: "name", label: "Category" },
      { key: "parentName", label: "Parent category" },
      { key: "description", label: "Description" },
    ],
  },
  taxes: {
    title: "Taxes",
    description: "Manage the tax rates available for your product catalogue.",
    columns: [
      { key: "name", label: "Tax" },
      { key: "rate", label: "Rate (%)" },
    ],
  },
  profiles: {
    title: "Team profiles",
    description: "People with access to your organisation’s workspace.",
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
    ],
  },
  orders: {
    title: "Orders",
    description: "Review customer orders and payment status.",
    columns: [
      { key: "reference", label: "Order reference" },
      { key: "email", label: "Customer" },
      { key: "total", label: "Total (NGN)" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ],
  },
  payments: {
    title: "Payments",
    description: "Review confirmed payments and balances.",
    columns: [
      { key: "reference", label: "Order reference" },
      { key: "total", label: "Total (NGN)" },
      { key: "paid", label: "Paid (NGN)" },
      { key: "status", label: "Status" },
    ],
  },
  customers: {
    title: "Customers",
    description: "Manage customer accounts and registration status.",
    columns: [
      { key: "name", label: "Company" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
    ],
  },
  suppliers: {
    title: "Vendors",
    description: "Manage vendor accounts and registration status.",
    columns: [
      { key: "name", label: "Company" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
    ],
  },
  enquiries: {
    title: "Enquiries",
    description: "Messages received from the contact form.",
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "subject", label: "Subject" },
      { key: "message", label: "Message" },
    ],
  },
  reviews: {
    title: "Product reviews",
    description:
      "Customer feedback will appear here when reviews are available.",
    columns: [
      { key: "product", label: "Product" },
      { key: "rating", label: "Rating" },
      { key: "message", label: "Review" },
    ],
  },
}
export default function ManagementPage({
  section,
  hideHeading = false,
}: {
  section: string
  hideHeading?: boolean
}) {
  const config = screens[section],
    params = useSearchParams(),
    client = useQueryClient()
  const pathname = usePathname()
  const router = useRouter()
  const productBase = pathname.startsWith("/supplier")
    ? "/supplier/products"
    : "/admin/products"
  const addButton = useRef<HTMLButtonElement>(null)
  const deleteCancelButton = useRef<HTMLButtonElement>(null)
  const deleteReturnFocus = useRef<HTMLButtonElement | null>(null)
  const [pagination, setPagination] = useState({
      scope: "",
      cursor: "",
      direction: "next",
    }),
    [editing, setEditing] = useState<DisplayRecord | null>(null),
    [open, setOpen] = useState(false),
    [remove, setRemove] = useState<DisplayRecord | null>(null),
    [busy, setBusy] = useState(false)
  const isTenantList = section === "suppliers" || section === "customers"
  const search = params.get("search") ?? "",
    scope = `${section}:${search}`,
    cursor = pagination.scope === scope ? pagination.cursor : "",
    direction = pagination.scope === scope ? pagination.direction : "next",
    q = new URLSearchParams({ search })
  if (cursor) {
    q.set("cursor", cursor)
    q.set("navigation", direction)
  }
  const query = useQuery({
    queryKey: ["portal", section, cursor, direction, search],
    queryFn: () => portalRecords(section, `?${q}&limit=50`),
  })
  const categories = useQuery({
    queryKey: ["portal", "categories"],
    queryFn: () => portalRecords("categories"),
    enabled: section === "products" || section === "categories",
  })
  const editable = ["products", "categories", "taxes"].includes(section)
  const isNewProduct = section === "products" && !editing
  const recordLabel =
    section === "products"
      ? "product"
      : section === "taxes"
        ? "tax"
        : editing
          ? "category"
          : "subcategory"
  const schema =
    section === "products"
      ? productFormSchema
      : section === "taxes"
        ? taxFormSchema
        : categoryFormSchema
  async function submit(
    values: Record<string, unknown>,
    event?: BaseSyntheticEvent
  ) {
    if (busy) return
    const submitter = (event?.nativeEvent as SubmitEvent | undefined)
      ?.submitter as HTMLButtonElement | null
    const productStatus = submitter?.value === "pending" ? "pending" : "draft"
    setBusy(true)
    const body =
      section === "products"
        ? {
            id: editing?.id,
            name: values.name,
            brand: editing ? String(values.brand ?? "") : undefined,
            category: values.category,
            description: values.description,
            price: Number(values.price),
            quantity: Number(values.quantity),
            currency: "NGN",
            ...(isNewProduct ? { status: productStatus } : {}),
          }
        : section === "taxes"
          ? {
              id: editing?.id,
              name: values.name,
              rate: Number(values.rate),
            }
          : {
              id: editing?.id,
              name: values.name,
              description: values.description,
              parent: values.parent || undefined,
            }
    try {
      const result = await changePortalRecord(
        section,
        editing ? "PATCH" : "POST",
        body
      )
      await Promise.all([
        client.invalidateQueries({ queryKey: ["portal"] }),
        client.invalidateQueries({ queryKey: ["products"] }),
        client.invalidateQueries({ queryKey: ["categories"] }),
      ])
      setOpen(false)
      toast.success(
        editing
          ? "Changes saved."
          : isNewProduct
            ? productStatus === "pending"
              ? "Product submitted for review."
              : "Product saved as a draft."
            : "Record created."
      )
      if (
        section === "products" &&
        !editing &&
        result &&
        typeof result === "object" &&
        "data" in result
      ) {
        const created = result.data
        if (
          created &&
          typeof created === "object" &&
          "id" in created &&
          typeof created.id === "string"
        )
          router.push(`${productBase}/${encodeURIComponent(created.id)}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save.")
    } finally {
      setBusy(false)
    }
  }

  function editRecord(record: DisplayRecord) {
    if (busy) return
    if (section === "products") {
      router.push(`${productBase}/${encodeURIComponent(record.id)}`)
      return
    }
    setEditing(record)
    setOpen(true)
  }

  async function deleteRecord() {
    if (!remove) return
    setBusy(true)
    try {
      await changePortalRecord(section, "DELETE", { id: remove.id })
      await Promise.all([
        client.invalidateQueries({ queryKey: ["portal"] }),
        client.invalidateQueries({ queryKey: ["products"] }),
        client.invalidateQueries({ queryKey: ["categories"] }),
      ])
      setRemove(null)
      toast.success("Record deleted.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to delete.")
    } finally {
      setBusy(false)
    }
  }
  const records = (query.data?.records ?? []).map((record) => ({
    ...record,
    category: record.categoryName ?? record.category,
  }))
  return (
    <div className="min-w-0 space-y-7">
      {!hideHeading && (
        <div
          className={section === "taxes" ? "w-full max-w-[760px]" : undefined}
        >
          <PageHeading
            title={config.title}
            description={config.description}
            action={
              editable ? (
                <Button
                  ref={addButton}
                  className="h-12 rounded-lg px-5 text-sm font-semibold"
                  onClick={() => {
                    setEditing(null)
                    setOpen(true)
                  }}
                >
                  <Plus />
                  Add{" "}
                  {section === "products"
                    ? "product"
                    : section === "taxes"
                      ? "tax"
                      : "subcategory"}
                </Button>
              ) : section === "suppliers" ? (
                <CreateAccount kind="vendor" />
              ) : section === "orders" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  <RotateCcw aria-hidden className="size-4" />
                  Refresh
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
      {section === "orders" && (
        <>
          <OrderDashboardSummary
            workspace={pathname.startsWith("/supplier") ? "supplier" : "admin"}
            loading={query.isPending}
            orders={
              query.isSuccess
                ? query.data.records.map((record) => ({
                    paymentStatus: record.paymentStatus,
                    total: record.total,
                    currency: record.currency,
                  }))
                : undefined
            }
          />
          <div>
            <h2 className="text-lg font-semibold text-[#2b4032]">
              Order history
            </h2>
            <p className="mt-1 text-sm text-[#5e6f63]">
              Review customer orders and payment information.
            </p>
          </div>
        </>
      )}
      <div className={section === "taxes" ? "w-full max-w-[760px]" : undefined}>
        {query.isPending ? (
          <TableSkeleton />
        ) : query.isError ? (
          <ContentError
            title={`We couldn’t load your ${config.title.toLowerCase()}`}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : (
          <>
            <RecordTable
              records={records}
              title={config.title}
              columns={config.columns}
              emptyDescription={
                section === "suppliers"
                  ? "Add a vendor account to start managing your partners."
                  : section === "customers"
                    ? "Customer accounts will appear here when they register."
                    : undefined
              }
              actions={
                editable
                  ? (record) =>
                      section === "products" || section === "taxes" ? (
                        <RecordRowActions
                          kind={section === "products" ? "product" : "tax"}
                          name={String(record.name ?? "record")}
                          disabled={busy}
                          dialogOpen={Boolean(remove) || open}
                          onPrimary={() => editRecord(record)}
                          onDelete={(trigger) => {
                            deleteReturnFocus.current = trigger
                            setRemove(record)
                          }}
                        />
                      ) : (
                        <div className="flex gap-2">
                          <button
                            className="grid size-11 place-items-center rounded-lg border border-[#e5eae6] text-[#607568] transition hover:border-[#b3c6b7] hover:bg-[#eff6f1] disabled:opacity-40"
                            aria-label={`Edit ${record.name}`}
                            disabled={busy}
                            onClick={() => editRecord(record)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            className="grid size-11 place-items-center rounded-lg border border-[#e5eae6] text-[#899189] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                            disabled={busy}
                            aria-label={`Delete ${record.name}`}
                            onClick={(event) => {
                              deleteReturnFocus.current = event.currentTarget
                              setRemove(record)
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )
                  : isTenantList
                    ? (record) => (
                        <Link
                          href={`/admin/${section === "customers" ? "customers" : "vendors"}/${encodeURIComponent(record.id)}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dfe6e2] bg-white px-3 text-sm font-medium text-[#345b43] transition hover:bg-[#f0f5f2] focus-visible:outline-2 focus-visible:outline-[#167b54]"
                          aria-label={`View details for ${record.name}`}
                        >
                          View details
                        </Link>
                      )
                    : undefined
              }
            />
            {(query.data?.nextCursor || query.data?.previousCursor) && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  disabled={!query.data.previousCursor}
                  onClick={() => {
                    setPagination({
                      scope,
                      direction: "previous",
                      cursor: query.data!.previousCursor!,
                    })
                  }}
                >
                  Previous page
                </Button>
                <Button
                  variant="outline"
                  disabled={!query.data.nextCursor}
                  onClick={() => {
                    setPagination({
                      scope,
                      direction: "next",
                      cursor: query.data!.nextCursor!,
                    })
                  }}
                >
                  Next page
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>
            {editing ? "Edit" : "Add"} {recordLabel}
          </DialogTitle>
          <DialogDescription>
            {section === "products"
              ? editing
                ? "Update the product details below."
                : "Save as a draft to finish later, or submit your product for review."
              : section === "taxes"
                ? "Set the tax name and percentage rate."
                : "Enter the category details below."}
          </DialogDescription>
          <ValidatedForm<Record<string, unknown>, Record<string, unknown>>
            schema={schema}
            onSubmit={submit}
            className="space-y-4"
          >
            <FormInputField
              id="record-name"
              name="name"
              label="Name"
              required
              minLength={2}
              defaultValue={String(editing?.name ?? "")}
            />
            {section === "products" && editing && (
              <FormInputField
                id="record-brand"
                name="brand"
                label="Brand (optional)"
                defaultValue={String(editing.brand ?? "")}
              />
            )}
            {section !== "taxes" && (
              <>
                <label
                  htmlFor="record-description"
                  className="block text-sm font-medium"
                >
                  Description
                </label>
                <FormTextarea
                  id="record-description"
                  name="description"
                  required
                  minLength={2}
                  defaultValue={String(editing?.description ?? "")}
                  className="form-input min-h-24"
                />
              </>
            )}
            {section === "taxes" && (
              <FormInputField
                id="record-rate"
                name="rate"
                label="Rate (%)"
                type="number"
                min="0"
                max="100"
                step="any"
                required
                defaultValue={Number(editing?.rate ?? 0)}
              />
            )}
            {(section === "products" ||
              (section === "categories" && !editing)) && (
              <div>
                <label
                  htmlFor="record-category"
                  className="mb-2 block text-sm font-medium"
                >
                  {section === "products" ? "Category" : "Parent category"}
                </label>
                <FormSelect
                  id="record-category"
                  name={section === "products" ? "category" : "parent"}
                  required
                  className="form-input"
                  defaultValue={String(
                    editing?.categoryId ?? editing?.category ?? ""
                  )}
                >
                  <option value="">Select a category</option>
                  {categories.data?.records.map((c) => (
                    <option key={c.id} value={c.id}>
                      {String(c.categoryPath ?? c.name)}
                    </option>
                  ))}
                </FormSelect>
                {categories.isError && (
                  <p className="text-destructive mt-2 text-sm">
                    Unable to load categories. Close and retry.
                  </p>
                )}
              </div>
            )}
            {section === "products" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInputField
                  id="record-price"
                  name="price"
                  label="Price (NGN)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={Number(editing?.price ?? "") || undefined}
                />
                <FormInputField
                  id="record-stock"
                  name="quantity"
                  label="Quantity"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={Number(editing?.quantity ?? 0)}
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              {isNewProduct ? (
                <>
                  <Button
                    type="submit"
                    name="productStatus"
                    value="draft"
                    variant="outline"
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save as draft"}
                  </Button>
                  <Button
                    type="submit"
                    name="productStatus"
                    value="pending"
                    disabled={busy}
                  >
                    {busy ? "Submitting…" : "Submit for review"}
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Save"}
                </Button>
              )}
            </DialogFooter>
          </ValidatedForm>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(remove)}
        onOpenChange={(v) => {
          if (!v && !busy) setRemove(null)
        }}
      >
        <DialogContent
          initialFocus={deleteCancelButton}
          finalFocus={() =>
            deleteReturnFocus.current?.isConnected
              ? deleteReturnFocus.current
              : addButton.current
          }
        >
          <DialogTitle>Delete this record?</DialogTitle>
          <DialogDescription>
            {String(remove?.name ?? "")} will be removed from your catalogue.
          </DialogDescription>
          <DialogFooter>
            <Button
              ref={deleteCancelButton}
              variant="outline"
              disabled={busy}
              onClick={() => setRemove(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={deleteRecord}
            >
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
