"use client"

import type { ReactNode } from "react"

type ConfirmationDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  icon?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        onClick={onCancel}
        className="absolute inset-0 bg-black/50"
      />

      <div className="bg-background relative w-full max-w-md rounded-xl border p-6 shadow-2xl">
        {icon && (
          <div className="bg-muted mb-4 grid size-11 place-items-center rounded-full">
            {icon}
          </div>
        )}

        <h2 className="text-lg font-semibold">{title}</h2>

        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-md border px-4 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground h-10 rounded-md px-4 text-sm font-semibold disabled:opacity-50"
                : "bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm font-semibold disabled:opacity-50"
            }
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
