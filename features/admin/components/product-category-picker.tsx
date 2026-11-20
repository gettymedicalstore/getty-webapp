"use client"

import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useId, useMemo } from "react"
import { useController } from "react-hook-form"
import { FieldError } from "@/components/shared/form/validated-form"

type CategoryRecord = {
  id: string
  name?: unknown
  parent?: unknown
  categoryPath?: unknown
}

type CategoryOption = {
  id: string
  name: string
  label: string
  parent: string | null
}

type CategoryGroup = {
  value: string
  items: CategoryOption[]
}

const emptyCategories: CategoryRecord[] = []

export default function ProductCategoryPicker({
  records = emptyCategories,
  defaultValue = "",
  disabled = false,
}: {
  records?: CategoryRecord[]
  defaultValue?: string
  disabled?: boolean
}) {
  const { field, fieldState } = useController({
    name: "category",
    defaultValue,
  })
  const categoryValue = field.value
  const updateCategory = field.onChange
  const id = useId()
  const errorId = `${id}-error`
  const { groups, options, parentIds } = useMemo(() => {
    const paths = new Map(
      records.map((record) => [
        String(record.categoryPath ?? record.name ?? ""),
        record.id,
      ])
    )
    const categories = records.map((record) => {
      const label = String(record.categoryPath ?? record.name ?? "")
      const separator = label.lastIndexOf(" / ")
      const parentPath = separator >= 0 ? label.slice(0, separator) : ""
      const parent =
        typeof record.parent === "string"
          ? record.parent
          : record.parent &&
              typeof record.parent === "object" &&
              "id" in record.parent &&
              typeof record.parent.id === "string"
            ? record.parent.id
            : parentPath
              ? (paths.get(parentPath) ?? null)
              : null
      return {
        id: record.id,
        name: String(record.name ?? ""),
        label,
        parent,
      }
    })
    const byId = new Map(categories.map((category) => [category.id, category]))
    const parentIds = new Set(
      categories.map((category) => category.parent).filter((id) => id !== null)
    )
    const standalone: CategoryOption[] = []
    const children = new Map<string, CategoryOption[]>()

    for (const category of categories) {
      if (parentIds.has(category.id)) continue
      if (category.parent && byId.has(category.parent)) {
        const siblings = children.get(category.parent) ?? []
        siblings.push(category)
        children.set(category.parent, siblings)
      } else {
        standalone.push(category)
      }
    }

    const groups: CategoryGroup[] = []
    if (standalone.length)
      groups.push({ value: "Categories", items: standalone })
    for (const category of categories) {
      const items = children.get(category.id)
      if (items?.length) groups.push({ value: category.label, items })
    }
    return {
      groups,
      options: groups.flatMap((group) => group.items),
      parentIds,
    }
  }, [records])

  // An existing product may still point at a parent category. Require a leaf
  // before the next save instead of silently keeping an unselectable value.
  useEffect(() => {
    if (parentIds.has(String(categoryValue ?? ""))) updateCategory("")
  }, [categoryValue, updateCategory, parentIds])

  const selected = options.find((option) => option.id === categoryValue) ?? null

  return (
    <div className="min-w-0">
      <Combobox.Root<CategoryOption>
        items={groups}
        value={selected}
        onValueChange={(option) => field.onChange(option?.id ?? "")}
        isItemEqualToValue={(a, b) => a.id === b.id}
        itemToStringLabel={(option) => option.label}
      >
        <Combobox.Label className="mb-2 block text-sm font-medium text-[#414651]">
          Category
        </Combobox.Label>
        <Combobox.Trigger
          ref={(element) => field.ref(element)}
          disabled={disabled}
          onBlur={() => field.onBlur()}
          aria-required="true"
          aria-invalid={Boolean(fieldState.error)}
          aria-describedby={fieldState.error ? errorId : undefined}
          className="form-input flex min-h-12 items-center justify-between gap-3 text-left disabled:opacity-50"
        >
          <span className="min-w-0 truncate">
            <Combobox.Value placeholder="Select a category" />
          </span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-[#73867a]" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner
            align="start"
            sideOffset={5}
            className="z-[60] w-[var(--anchor-width)] min-w-64"
          >
            <Combobox.Popup
              aria-label="Choose a product category"
              className="overflow-hidden rounded-xl border border-[#dce2de] bg-white shadow-[0_18px_45px_-18px_rgba(18,44,28,0.28)] outline-none"
            >
              <div className="flex items-center gap-2 border-b border-[#e8eee9] px-3">
                <Search
                  aria-hidden
                  className="size-4 shrink-0 text-[#73867a]"
                />
                <Combobox.Input
                  aria-label="Search categories"
                  autoFocus
                  placeholder="Search categories..."
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#34453a] outline-none placeholder:text-[#8b938e]"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5">
                <Combobox.Empty className="px-3 py-4 text-sm text-[#6d7a72]">
                  No categories found.
                </Combobox.Empty>
                <Combobox.List>
                  {(group: CategoryGroup) => (
                    <Combobox.Group key={group.value} items={group.items}>
                      <Combobox.GroupLabel className="sticky top-0 z-10 bg-[#f3f7f4] px-3 py-1.5 text-xs font-semibold text-[#557364]">
                        {group.value}
                      </Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(option: CategoryOption) => (
                          <Combobox.Item
                            key={option.id}
                            value={option}
                            className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-[#34453a] outline-none data-highlighted:bg-[#edf5ef] data-selected:text-[#12623e]"
                          >
                            <span>{option.name}</span>
                            <Combobox.ItemIndicator>
                              <Check aria-hidden className="size-4" />
                            </Combobox.ItemIndicator>
                          </Combobox.Item>
                        )}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )}
                </Combobox.List>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <FieldError id={errorId} message={fieldState.error?.message} />
    </div>
  )
}
