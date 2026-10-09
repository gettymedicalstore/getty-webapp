"use client"

import { useRef, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export const fieldClass =
  "h-12 w-full rounded-lg border border-[#dce2de] bg-white px-3.5 text-base text-[#34453a] outline-none focus-visible:border-[#1b5944] focus-visible:ring-2 focus-visible:ring-[#1b5944]/15 disabled:opacity-50 sm:text-sm"
export function valueText(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback
}
export function nullableText(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim() || null
}
export function optionalNumber(form: FormData, key: string) {
  const value = form.get(key)
  return value === "" || value === null ? null : Number(value)
}
export function money(value: unknown, currency = "NGN") {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(
        value
      )
    : "—"
}

export function useProductMutation(product: string) {
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const inFlight = useRef(false)
  async function run(
    action: () => Promise<unknown>,
    message: string,
    done?: () => void
  ) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      await action()
      await Promise.all([
        client.invalidateQueries({ queryKey: ["portal"] }),
        client.invalidateQueries({ queryKey: ["managed-product", product] }),
        client.invalidateQueries({ queryKey: ["products"] }),
        client.invalidateQueries({ queryKey: ["inventory"] }),
      ])
      toast.success(message)
      done?.()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your changes could not be saved. Please try again."
      )
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }
  return { busy, error, setError, run }
}

export function FormCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border border-[#dfe6e2] bg-white shadow-[0_2px_8px_rgba(30,50,35,.025)]">
      <div className="px-5 pt-6 sm:px-7 sm:pt-7">
        <h2 className="text-2xl font-semibold tracking-tight text-[#123f2d]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6d7a72]">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function FormError({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-700"
    >
      {message}
    </p>
  ) : null
}

export function FormActions({
  busy,
  disabled = false,
  onCancel,
  label = "Save changes",
}: {
  busy: boolean
  disabled?: boolean
  onCancel?: () => void
  label?: string
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-[#e7ece9] px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="rounded-lg text-sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
      <Button
        type="submit"
        disabled={busy || disabled}
        className="rounded-lg text-sm"
      >
        {busy ? "Saving…" : label}
      </Button>
    </div>
  )
}

export function DeleteProductItem({
  name,
  open,
  onClose,
  busy,
  error,
  onConfirm,
}: {
  name: string
  open: boolean
  onClose: () => void
  busy: boolean
  error: string
  onConfirm: () => void
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose()
      }}
    >
      <DialogContent initialFocus={cancel} showCloseButton={!busy}>
        <DialogTitle>Remove {name}?</DialogTitle>
        <DialogDescription>
          This will remove {name} from this product.
        </DialogDescription>
        <FormError message={error} />
        <DialogFooter>
          <Button
            ref={cancel}
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProductPanelHeading({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[#283c30]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#5e6f63]">{description}</p>
      </div>
      {action}
    </div>
  )
}
