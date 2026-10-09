"use client"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"
import { addressFormSchema } from "@/lib/form-schemas"
import type { z } from "zod"

import { useState } from "react"
import { MapPin, Plus } from "lucide-react"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useDeviceStore } from "@/lib/use-device-store"
import PageHeading from "@/components/shared/page-heading"
import EmptyState from "@/components/shared/empty-state"
import AddressCard from "@/components/customer/addresses/address-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
type Address = {
  id: string
  label: string
  recipient: string
  phone: string
  line1: string
  city: string
  state: string
  country: string
  isDefault?: boolean
}
const empty: Address[] = []
export default function Addresses() {
  const { data: session } = useAuthSession()
  const [saved, setSaved] = useDeviceStore<Address[]>(
    `getty-addresses:${session?.user?.id ?? "guest"}`,
    empty
  )
  const addresses = Array.isArray(saved)
    ? saved.filter(
        (a) =>
          a &&
          typeof a.id === "string" &&
          typeof a.label === "string" &&
          typeof a.recipient === "string" &&
          typeof a.line1 === "string" &&
          typeof a.phone === "string" &&
          typeof a.city === "string" &&
          typeof a.state === "string"
      )
    : empty
  const [editing, setEditing] = useState<Address | null>(null),
    [open, setOpen] = useState(false),
    [remove, setRemove] = useState<string | null>(null)
  function submit(values: z.output<typeof addressFormSchema>) {
    if (!session?.user) return
    const address = {
      id: editing?.id ?? crypto.randomUUID(),
      label: values.label,
      recipient: values.recipient,
      phone: values.phone,
      line1: values.line1,
      city: values.city,
      state: values.state,
      country: "Nigeria",
      isDefault: editing?.isDefault ?? addresses.length === 0,
    }
    if (
      !setSaved(
        editing
          ? addresses.map((a) => (a.id === address.id ? address : a))
          : [...addresses, address]
      )
    )
      return
    setOpen(false)
    toast.success("Address saved.")
  }
  return (
    <div className="space-y-7">
      <PageHeading
        title="Delivery addresses"
        description="Save delivery addresses on this device for future orders."
        action={
          <Button
            className="h-11"
            disabled={!session?.user}
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus />
            Add address
          </Button>
        }
      />
      {addresses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              onEdit={(id) => {
                setEditing(addresses.find((a) => a.id === id) ?? null)
                setOpen(true)
              }}
              onDelete={setRemove}
              onSetDefault={(id) =>
                setSaved(
                  addresses.map((a) => ({ ...a, isDefault: a.id === id }))
                )
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No saved addresses"
          description="Add your home, office or hospital address to keep delivery details handy."
          icon={MapPin}
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit address" : "Add delivery address"}
            </DialogTitle>
            <DialogDescription>
              Enter the recipient and delivery details.
            </DialogDescription>
          </DialogHeader>
          <ValidatedForm
            schema={addressFormSchema}
            onSubmit={submit}
            className="space-y-4"
          >
            {[
              {
                name: "label",
                label: "Address label",
                value: editing?.label ?? "Home",
              },
              {
                name: "recipient",
                label: "Recipient name",
                value: editing?.recipient ?? session?.user?.name,
              },
              {
                name: "phone",
                label: "Phone number",
                value: editing?.phone ?? session?.user?.phone,
              },
              { name: "line1", label: "Street address", value: editing?.line1 },
              { name: "city", label: "City", value: editing?.city },
              { name: "state", label: "State", value: editing?.state },
            ].map((f) => (
              <FormInputField
                key={f.name}
                id={f.name}
                name={f.name}
                label={f.label}
                defaultValue={f.value}
                required
                minLength={f.name === "phone" ? 10 : 2}
              />
            ))}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save address</Button>
            </DialogFooter>
          </ValidatedForm>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(remove)}
        onOpenChange={(v) => {
          if (!v) setRemove(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this address?</DialogTitle>
            <DialogDescription>
              You can add it again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const remaining = addresses.filter((a) => a.id !== remove)
                if (!remaining.some((a) => a.isDefault) && remaining[0])
                  remaining[0] = { ...remaining[0], isDefault: true }
                setSaved(remaining)
                setRemove(null)
              }}
            >
              Delete address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
