"use client"
import {
  ValidatedForm,
  FormInput,
} from "@/components/shared/form/validated-form"
import { accountFormSchema } from "@/lib/form-schemas"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, CircleCheck, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createTenantAccount } from "../api/accounts"
import { getProfileRoles } from "../api/team-profiles"
import ProfileRoleField from "./profile-role-field"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
export default function CreateAccount({
  kind,
}: {
  kind: "vendor" | "profile"
}) {
  const client = useQueryClient(),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [createdAccount, setCreatedAccount] = useState<{
      name: string
      email: string
    } | null>(null)
  const roles = useQuery({
    queryKey: ["portal", "profile-roles"],
    queryFn: getProfileRoles,
    enabled: open && kind === "profile",
    staleTime: 5 * 60 * 1000,
  })
  async function submit(fields: {
    name: string
    email: string
    [key: string]: unknown
  }) {
    if (busy || (kind === "profile" && !roles.data)) return
    setBusy(true)
    setError("")
    try {
      await createTenantAccount(kind, fields)
      setCreatedAccount({
        name: String(fields.name ?? "").trim(),
        email: String(fields.email ?? "").trim(),
      })
      void client.invalidateQueries({ queryKey: ["portal"] }).catch(() => {
        toast.error(
          "Account created, but the list could not refresh. Reload to see it."
        )
      })
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to create this account."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Button
        type="button"
        className="h-12 rounded-lg px-5 text-sm font-semibold"
        onClick={() => {
          setOpen(true)
          setCreatedAccount(null)
          setError("")
        }}
      >
        <Plus aria-hidden className="size-4" />
        Add {kind === "vendor" ? "vendor" : "team profile"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {createdAccount ? (
            <div role="status" className="space-y-5">
              <div className="grid size-12 place-items-center rounded-xl border border-[#cfe9d6] bg-[#eaf7ee] text-[#17814e]">
                <CircleCheck aria-hidden className="size-6" strokeWidth={1.8} />
              </div>
              <div className="space-y-2">
                <DialogTitle>
                  {kind === "vendor"
                    ? "Vendor account created"
                    : "Team profile created"}
                </DialogTitle>
                <DialogDescription>
                  {kind === "vendor"
                    ? "The vendor account is ready to manage from your workspace."
                    : "The team profile is ready. Login credentials will be sent to their email."}
                </DialogDescription>
              </div>
              <div className="rounded-xl border border-[#e1e9e3] bg-[#f7faf7] px-4 py-3.5">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[#708175] uppercase">
                  {kind === "vendor" ? "Vendor" : "Team member"}
                </p>
                <p className="mt-1 text-sm font-semibold break-words text-[#263e30]">
                  {createdAccount.name}
                </p>
                <p className="mt-0.5 text-xs break-all text-[#66776a]">
                  {createdAccount.email}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <DialogTitle>
                Create {kind === "vendor" ? "vendor account" : "team profile"}
              </DialogTitle>
              <DialogDescription>
                {kind === "vendor"
                  ? "Add a vendor business and its administrator details."
                  : "Add a team member and choose their access role."}
              </DialogDescription>
              <ValidatedForm
                schema={accountFormSchema(kind)}
                onSubmit={submit}
                className="space-y-4"
              >
                {[
                  [
                    "name",
                    kind === "vendor" ? "Vendor business name" : "Full name",
                    kind === "vendor" ? 255 : 180,
                  ],
                  ["email", "Email address", 254],
                  ["phone", "Phone number", 36],
                  ...(kind === "vendor"
                    ? [
                        ["profile", "Administrator name", 180],
                        ["country", "Country code", 2],
                      ]
                    : []),
                ].map(([key, label, max]) => (
                  <label key={key} className="block text-sm font-medium">
                    {label}
                    <FormInput
                      name={String(key)}
                      className="form-input mt-2"
                      type={
                        key === "email"
                          ? "email"
                          : key === "phone"
                            ? "tel"
                            : "text"
                      }
                      maxLength={Number(max)}
                      required={key !== "phone" || kind === "vendor"}
                      disabled={busy}
                      defaultValue={key === "country" ? "NG" : undefined}
                    />
                  </label>
                ))}
                {kind === "profile" && <ProfileRoleField disabled={busy} />}
                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700"
                  >
                    <CircleAlert
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0"
                    />
                    {error}
                  </p>
                )}
                <DialogFooter className="mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || (kind === "profile" && !roles.data)}
                  >
                    {busy ? "Creating…" : "Create account"}
                  </Button>
                </DialogFooter>
              </ValidatedForm>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
