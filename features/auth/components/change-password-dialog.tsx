"use client"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"
import type { z } from "zod"
import { changePasswordFormSchema } from "@/lib/form-schemas"

import { useRef, useState } from "react"
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { confirmPasswordChange } from "../api/change-password"

export default function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formVersion, setFormVersion] = useState(0)
  const currentPasswordField = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [complete, setComplete] = useState(false)

  function close() {
    if (inFlight.current) return
    onOpenChange(false)
    setFormVersion((value) => value + 1)
    setError("")
    setComplete(false)
  }

  async function submit({
    currentPassword,
    newPassword,
  }: z.output<typeof changePasswordFormSchema>) {
    if (inFlight.current) return
    inFlight.current = true
    setError("")
    setPending(true)
    try {
      await confirmPasswordChange({
        currentPassword,
        newPassword,
      })
      setComplete(true)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not change your password."
      )
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close()
      }}
    >
      <DialogContent
        className="max-h-[min(90dvh,820px)] overflow-y-auto sm:max-w-lg"
        initialFocus={currentPasswordField}
        showCloseButton={!pending}
        aria-busy={pending}
      >
        {complete ? (
          <div role="status" className="space-y-5">
            <span className="grid size-12 place-items-center rounded-xl bg-[#e7f5eb] text-[#16804c]">
              <CheckCircle2 aria-hidden className="size-6" />
            </span>
            <div className="space-y-2">
              <DialogTitle>Password changed</DialogTitle>
              <DialogDescription>
                Your password has been updated. You can continue using your
                account.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <span className="grid size-11 place-items-center rounded-xl bg-[#e7f5eb] text-[#16804c]">
              <KeyRound aria-hidden className="size-5" />
            </span>
            <div className="space-y-2">
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>
                Enter your current password, then choose and confirm your new
                password.
              </DialogDescription>
            </div>
            <ValidatedForm
              key={formVersion}
              schema={changePasswordFormSchema}
              defaultValues={{
                currentPassword: "",
                newPassword: "",
                confirmation: "",
              }}
              onSubmit={submit}
              className="space-y-4"
            >
              <FormInputField
                ref={currentPasswordField}
                label="Current password"
                type="password"
                autoComplete="current-password"
                name="currentPassword"
                disabled={pending}
                required
              />
              <FormInputField
                label="New password"
                type="password"
                autoComplete="new-password"
                name="newPassword"
                disabled={pending}
                hint="Use at least eight characters."
                required
              />
              <FormInputField
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                name="confirmation"
                disabled={pending}
                required
              />
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-800"
                >
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending} aria-busy={pending}>
                  {pending && (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  )}
                  {pending ? "Updating…" : "Change password"}
                </Button>
              </DialogFooter>
            </ValidatedForm>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
