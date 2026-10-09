"use client"

import { useMemo, useRef, useState } from "react"
import { Menu } from "@base-ui/react/menu"
import {
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ValidatedForm,
  FormInput,
} from "@/components/shared/form/validated-form"
import { searchSchema } from "@/lib/form-schemas"
import AdminTablePagination from "@/components/admin/tables/admin-table-pagination"
import { cn } from "@/lib/utils"
import {
  buildCategoryTree,
  categoryRows,
  filterCategoryTree,
  type CategoryNode,
  type CategoryRecord,
} from "../utils/category-tree"

export type CategoryAction = "add" | "edit" | "delete"
type ActionHandler = (
  action: CategoryAction,
  node: CategoryNode,
  trigger: HTMLButtonElement | null
) => void
const pageSize = 10

export default function CategoryTreeTable({
  records,
  busy,
  dialogOpen,
  onAction,
}: {
  records: CategoryRecord[]
  busy: boolean
  dialogOpen: boolean
  onAction: ActionHandler
}) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const tree = useMemo(() => buildCategoryTree(records), [records])
  const nodesById = useMemo(
    () => new Map(categoryRows(tree).map(({ node }) => [node.record.id, node])),
    [tree]
  )
  const filtered = useMemo(
    () => filterCategoryTree(tree, search),
    [tree, search]
  )
  const allRows = useMemo(() => categoryRows(filtered), [filtered])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const rows = categoryRows(
    filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    collapsed
  )
  const branchIds = allRows
    .filter(({ node }) => node.children.length)
    .map(({ node }) => node.record.id)
  const allCollapsed =
    branchIds.length > 0 && branchIds.every((id) => collapsed.has(id))

  function toggle(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section
      aria-label="Category tree"
      className="min-w-0 overflow-hidden rounded-xl border border-[#e2e8e3] bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-[#e8ede9] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <ValidatedForm
          schema={searchSchema}
          autoSubmit={0}
          onSubmit={({ search }) => {
            setSearch(search)
            setPage(0)
            setCollapsed(new Set())
          }}
          className="relative w-full sm:max-w-xs"
        >
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#839088]"
          />
          <FormInput
            name="search"
            type="search"
            aria-label="Search categories"
            placeholder="Search categories…"
            className="h-11 rounded-lg border-[#e2e8e3] pl-9 text-base shadow-none sm:text-sm"
          />
        </ValidatedForm>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 sm:justify-end">
          <p role="status" className="text-xs text-[#68776d]">
            {filtered.length}{" "}
            {filtered.length === 1 ? "category" : "categories"}
            <span aria-hidden> · </span>
            {allRows.length - filtered.length} subcategories
            {search.trim() ? " in view" : ""}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 rounded-lg text-xs"
            disabled={!branchIds.length}
            onClick={() =>
              setCollapsed(allCollapsed ? new Set() : new Set(branchIds))
            }
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        </div>
      </div>

      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">
          Categories and their subcategories. Use the disclosure buttons to
          expand or collapse each branch.
        </caption>
        <thead className="border-b border-[#e8ede9] bg-[#f8faf9] text-xs font-medium text-[#68776d]">
          <tr>
            <th
              scope="col"
              className="px-4 py-4 font-medium sm:w-[46%] sm:px-5"
            >
              Category
            </th>
            <th
              scope="col"
              className="hidden px-5 py-4 font-medium sm:table-cell"
            >
              Description
            </th>
            <th
              scope="col"
              className="w-16 px-2 py-4 text-center font-medium sm:w-20"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef1ef]">
          {rows.map(({ node, depth, parentPath }) => {
            const name = String(node.record.name ?? "Untitled category")
            const description = String(node.record.description ?? "")
            const isBranch = node.children.length > 0
            const expanded = !collapsed.has(node.record.id)
            return (
              <tr
                key={node.record.id}
                className={cn(
                  "transition-colors hover:bg-[#fafcfb]",
                  depth === 0 && "bg-[#fcfdfc]"
                )}
              >
                <th
                  scope="row"
                  className="py-3 pl-2 text-left font-normal sm:pl-3"
                >
                  <div
                    style={{ paddingLeft: `${Math.min(depth, 4) * 16}px` }}
                    className="flex min-w-0 items-start"
                  >
                    {isBranch ? (
                      <button
                        type="button"
                        aria-label={`${expanded ? "Collapse" : "Expand"} ${name}`}
                        aria-expanded={expanded}
                        onClick={() => toggle(node.record.id)}
                        className="grid size-11 shrink-0 place-items-center rounded-lg text-[#597265] outline-none hover:bg-[#eaf1ec] focus-visible:ring-2 focus-visible:ring-[#1b5442]"
                      >
                        <ChevronRight
                          aria-hidden
                          className={cn(
                            "size-4 transition-transform",
                            expanded && "rotate-90"
                          )}
                        />
                      </button>
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-11 w-11 shrink-0 items-center justify-center"
                      >
                        <span className="h-px w-3 bg-[#d2ddd6]" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 py-2.5 pr-2">
                      <div className="flex items-start gap-2.5">
                        {depth === 0 &&
                          (expanded && isBranch ? (
                            <FolderOpen
                              aria-hidden
                              className="mt-0.5 hidden size-4 shrink-0 text-[#648775] sm:block"
                            />
                          ) : (
                            <Folder
                              aria-hidden
                              className="mt-0.5 hidden size-4 shrink-0 text-[#648775] sm:block"
                            />
                          ))}
                        <div className="min-w-0">
                          <span
                            className={cn(
                              "block leading-5 break-words text-[#2c4034]",
                              depth === 0 ? "font-semibold" : "font-medium"
                            )}
                          >
                            {name}
                          </span>
                          {parentPath && (
                            <span className="sr-only">{` Subcategory of ${parentPath}.`}</span>
                          )}
                          {isBranch && (
                            <span className="mt-1 block text-xs font-normal text-[#738279]">
                              {node.children.length}{" "}
                              {node.children.length === 1
                                ? "subcategory"
                                : "subcategories"}
                            </span>
                          )}
                          {description && (
                            <p className="mt-1.5 text-xs leading-5 font-normal break-words text-[#68776d] sm:hidden">
                              {description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </th>
                <td className="hidden px-5 py-4 text-sm leading-6 break-words text-[#68776d] sm:table-cell">
                  {description || <span className="text-[#a2afa6]">—</span>}
                </td>
                <td className="px-2 py-3 text-center">
                  <CategoryActions
                    node={nodesById.get(node.record.id) ?? node}
                    disabled={busy}
                    dialogOpen={dialogOpen}
                    onAction={onAction}
                  />
                </td>
              </tr>
            )
          })}
          {!rows.length && (
            <tr>
              <td colSpan={3} className="px-5 py-14 text-center">
                <Folder
                  aria-hidden
                  className="mx-auto mb-3 size-8 text-[#a2afa5]"
                  strokeWidth={1.5}
                />
                <p className="font-medium text-[#3e5144]">
                  {search ? "No matching categories" : "No categories yet"}
                </p>
                <p className="mt-2 text-sm text-[#68776d]">
                  {search
                    ? "Try another name or description."
                    : "Add your first category to organize the catalogue."}
                </p>
                {search && (
                  <Button
                    variant="ghost"
                    className="mt-3 text-sm"
                    onClick={() => {
                      setSearch("")
                      setPage(0)
                      setCollapsed(new Set())
                    }}
                  >
                    Clear search
                  </Button>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {filtered.length > pageSize && (
        <div className="border-t border-[#e8ede9]">
          <p className="px-5 pt-4 text-xs text-[#68776d]">
            Pagination counts parent categories; subcategories stay with their
            parent.
          </p>
          <AdminTablePagination
            page={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  )
}

function CategoryActions({
  node,
  disabled,
  dialogOpen,
  onAction,
}: {
  node: CategoryNode
  disabled: boolean
  dialogOpen: boolean
  onAction: ActionHandler
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const itemClass =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm outline-none data-highlighted:bg-[#f0f5f2] data-highlighted:text-[#1b4d3e]"
  return (
    <Menu.Root>
      <Menu.Trigger
        ref={trigger}
        disabled={disabled}
        aria-label={`Actions for ${String(node.record.name ?? "category")}`}
        className="mx-auto grid size-11 place-items-center rounded-lg border border-transparent text-[#65776a] transition outline-none hover:border-[#dfe7e1] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#1b5442] data-popup-open:border-[#dfe7e1] data-popup-open:bg-white"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup
            finalFocus={!dialogOpen}
            className="w-52 origin-(--transform-origin) rounded-xl border border-[#e2e8e3] bg-white p-1.5 text-[#374d3e] shadow-[0_8px_32px_rgba(25,50,35,0.12)] outline-none"
          >
            <Menu.Item
              className={itemClass}
              onClick={() => onAction("add", node, trigger.current)}
            >
              <Plus aria-hidden className="size-4" />
              Add subcategory
            </Menu.Item>
            <Menu.Item
              className={itemClass}
              onClick={() => onAction("edit", node, trigger.current)}
            >
              <Pencil aria-hidden className="size-4" />
              Edit
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-[#e8ede9]" />
            <Menu.Item
              className={cn(
                itemClass,
                "text-[#b04436] data-highlighted:bg-[#fff3f1] data-highlighted:text-[#9f3326]"
              )}
              onClick={() => onAction("delete", node, trigger.current)}
            >
              <Trash2 aria-hidden className="size-4" />
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
