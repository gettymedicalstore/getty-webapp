"use client"
import {
  ValidatedForm,
  FormInput,
} from "@/components/shared/form/validated-form"
import { searchSchema } from "@/lib/form-schemas"

import { Search } from "lucide-react"
import type { ReactNode } from "react"

type AdminTableToolbarProps = {
  search: string
  searchPlaceholder?: string
  onSearchChange: (value: string) => void
  filters?: ReactNode
  actions?: ReactNode
}

export default function AdminTableToolbar({
  search,
  searchPlaceholder = "Search records...",
  onSearchChange,
  filters,
  actions,
}: AdminTableToolbarProps) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b p-4 lg:flex-row lg:items-center">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <ValidatedForm
          schema={searchSchema}
          autoSubmit={0}
          values={{ search }}
          onSubmit={({ search }) => onSearchChange(search)}
          className="relative w-full sm:max-w-sm"
        >
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />

          <FormInput
            name="search"
            placeholder={searchPlaceholder}
            className="bg-background focus:border-primary h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none"
          />
        </ValidatedForm>

        {filters}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
