"use client"

import { Check, MapPin, Pencil, Trash2 } from "lucide-react"

type AddressCardProps = {
  address: {
    id: string
    label: string
    recipient: string
    phone: string
    line1: string
    line2?: string
    city: string
    state: string
    country: string
    isDefault?: boolean
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onSetDefault?: (id: string) => void
}

export default function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  return (
    <article className="bg-background rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
          <MapPin className="size-5" />
        </div>

        {address.isDefault && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <Check className="size-3" />
            Default
          </span>
        )}
      </div>

      <h3 className="mt-4 font-semibold">{address.label}</h3>

      <div className="text-muted-foreground mt-3 space-y-1 text-sm leading-6">
        <p className="text-foreground font-medium">{address.recipient}</p>
        <p>{address.phone}</p>
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}, {address.state}
        </p>
        <p>{address.country}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(address.id)}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(address.id)}
            className="text-destructive inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        )}

        {!address.isDefault && onSetDefault && (
          <button
            type="button"
            onClick={() => onSetDefault(address.id)}
            className="text-primary ml-auto text-xs font-semibold hover:underline"
          >
            Set as default
          </button>
        )}
      </div>
    </article>
  )
}
