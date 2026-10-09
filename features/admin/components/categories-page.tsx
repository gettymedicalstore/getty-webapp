"use client"
import {
  ValidatedForm,
  FormInputField,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import { categoryFormSchema } from "@/lib/form-schemas"

import { useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FolderTree, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import PageHeading from "@/components/shared/page-heading"
import ContentError from "@/components/shared/content-error"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { changePortalRecord, portalRecords } from "../api/portal"
import {
  categoryRows,
  type CategoryNode,
  type CategoryRecord,
} from "../utils/category-tree"
import CategoryTreeTable, { type CategoryAction } from "./category-tree-table"

type CategoryDialog =
  | { kind: "create"; parent: CategoryRecord | null }
  | { kind: "edit" | "delete"; node: CategoryNode }

export default function CategoriesPage() {
  const client = useQueryClient()
  const [dialog, setDialog] = useState<CategoryDialog | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const addButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const query = useQuery({
    queryKey: ["portal", "categories"],
    queryFn: () => portalRecords("categories"),
  })
  const editing = dialog?.kind === "edit" ? dialog.node.record : null
  const parent = dialog?.kind === "create" ? dialog.parent : null
  const deleting = dialog?.kind === "delete" ? dialog.node : null
  const label = parent ? "subcategory" : "category"
  const title = deleting
    ? "Delete category?"
    : editing
      ? "Edit category"
      : `Add ${label}`

  function openAction(
    action: CategoryAction,
    node: CategoryNode,
    trigger: HTMLButtonElement | null
  ) {
    if (busy) return
    returnFocus.current = trigger
    setError("")
    setDialog(
      action === "add"
        ? { kind: "create", parent: node.record }
        : { kind: action, node }
    )
    setOpen(true)
  }

  async function refreshCategories() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["portal"] }),
      client.invalidateQueries({ queryKey: ["products"] }),
      client.invalidateQueries({ queryKey: ["categories"] }),
    ])
  }

  async function save({
    name,
    description,
  }: {
    name: string
    description: string
  }) {
    if (busy || !dialog || deleting) return
    setBusy(true)
    setError("")
    try {
      await changePortalRecord(
        "categories",
        editing ? "PATCH" : "POST",
        editing
          ? { id: editing.id, name, description }
          : { parent: parent?.id ?? null, name, description }
      )
      await refreshCategories()
      setOpen(false)
      toast.success(
        editing
          ? "Category updated."
          : parent
            ? "Subcategory added."
            : "Category added."
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save the category. Please try again."
      )
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy || !deleting) return
    setBusy(true)
    setError("")
    try {
      await changePortalRecord("categories", "DELETE", {
        id: deleting.record.id,
      })
      await refreshCategories()
      setOpen(false)
      toast.success("Category deleted.")
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to delete the category. Please try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Categories"
        description="Organize your catalogue with categories and subcategories."
        action={
          <Button
            ref={addButton}
            disabled={busy}
            className="h-12 rounded-lg text-sm"
            onClick={() => {
              returnFocus.current = addButton.current
              setError("")
              setDialog({ kind: "create", parent: null })
              setOpen(true)
            }}
          >
            <Plus aria-hidden className="size-4" />
            Add category
          </Button>
        }
      />
      {query.isPending ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ContentError
          title="We couldn’t load your categories"
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <CategoryTreeTable
          records={query.data.records}
          busy={busy}
          dialogOpen={open}
          onAction={openAction}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !busy) setOpen(false)
        }}
      >
        <DialogContent
          className="max-h-[90dvh] gap-6 overflow-y-auto sm:max-w-lg"
          showCloseButton={!busy}
          initialFocus={deleting ? cancelButton : nameInput}
          finalFocus={() =>
            returnFocus.current?.isConnected
              ? returnFocus.current
              : addButton.current
          }
        >
          <div className="space-y-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {deleting
                ? `Delete “${String(deleting.record.name ?? "this category")}” from your catalogue? This action cannot be undone.`
                : editing
                  ? "Update the name and description for this category."
                  : parent
                    ? `Create a subcategory under “${String(parent.name)}”.`
                    : "Create a top-level category for your medical supplies."}
            </DialogDescription>
          </div>
          {deleting ? (
            <div className="space-y-5">
              {deleting.children.length > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  This category contains{" "}
                  {categoryRows(deleting.children).length} subcategories. Review
                  these before deleting the category.
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  ref={cancelButton}
                  variant="outline"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" disabled={busy} onClick={remove}>
                  <Trash2 aria-hidden className="size-4" />
                  {busy ? "Deleting…" : "Delete category"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <ValidatedForm
              schema={categoryFormSchema}
              key={
                editing
                  ? `edit:${editing.id}`
                  : `create:${parent?.id ?? "root"}`
              }
              onSubmit={save}
              className="space-y-6"
              aria-busy={busy}
            >
              {parent && (
                <div className="flex items-start gap-3 rounded-lg border border-[#dfe8e2] bg-[#f6f9f7] p-3.5">
                  <FolderTree
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-[#537561]"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-[#68776d]">Parent category</p>
                    <p className="mt-1 text-sm font-medium break-words text-[#2c4034]">
                      {String(parent.categoryPath ?? parent.name)}
                    </p>
                  </div>
                </div>
              )}
              <FormInputField
                ref={nameInput}
                name="name"
                label={parent ? "Subcategory name" : "Category name"}
                placeholder={
                  parent ? "e.g. Diagnostic imaging" : "e.g. Dental equipment"
                }
                defaultValue={String(editing?.name ?? "")}
                required
                minLength={2}
                disabled={busy}
              />
              <div className="space-y-2">
                <label
                  htmlFor="category-description"
                  className="block text-sm font-medium text-[#414651]"
                >
                  Description{" "}
                  <span aria-hidden className="text-destructive">
                    *
                  </span>
                </label>
                <FormTextarea
                  id="category-description"
                  name="description"
                  placeholder="Describe the products that belong here."
                  defaultValue={String(editing?.description ?? "")}
                  required
                  minLength={2}
                  rows={5}
                  disabled={busy}
                  className="focus-visible:border-primary focus-visible:ring-primary/10 block min-h-36 w-full resize-y rounded-lg border border-[#dce2de] bg-white p-3.5 text-base leading-6 text-[#414651] shadow-none transition-[border-color,box-shadow] outline-none placeholder:text-[#8b938e] hover:border-[#bac7be] focus-visible:ring-3 disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-500/20 sm:text-sm"
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </p>
              )}
              <DialogFooter className="border-t border-[#e8ede9] pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : `Add ${label}`}
                </Button>
              </DialogFooter>
            </ValidatedForm>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
