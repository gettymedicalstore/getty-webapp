"use client"
import {
  ValidatedForm,
  FormInputField,
} from "@/components/shared/form/validated-form"
import { addressFormSchema } from "@/lib/form-schemas"
import type { z } from "zod"

import { useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import parsePhoneNumber from "libphonenumber-js/min"
import { MapPin, Plus } from "lucide-react"
import { toast } from "sonner"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import {
  createAddress,
  deleteAddress,
  findCreatedAddress,
  getSavedAddresses,
  updateAddress,
  type AddressInput,
} from "@/features/checkout/api/addresses"
import { deliverySchema } from "@/features/checkout/schemas/checkout-schema"
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
  isDefault: boolean
}
export default function Addresses() {
  const pendingCreation = useRef<{
    input: AddressInput
    previousIds: string[]
  } | null>(null)
  const { data: session } = useAuthSession()
  const queryClient = useQueryClient()
  const queryKey = ["saved-addresses", session?.user?.id]
  const saved = useQuery({
    queryKey,
    queryFn: getSavedAddresses,
    enabled: Boolean(session?.user),
  })
  const addresses: Address[] =
    saved.data?.map((entry) => ({
      id: entry.id,
      isDefault: entry.isDefault,
      label: entry.label,
      recipient: entry.delivery.name,
      phone: entry.delivery.phone,
      line1: entry.delivery.address,
      city: entry.delivery.city,
      state: entry.delivery.state,
      country:
        entry.delivery.country === "NG" ? "Nigeria" : entry.delivery.country,
    })) ?? []
  const [editing, setEditing] = useState<Address | null>(null),
    [open, setOpen] = useState(false),
    [remove, setRemove] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  async function submit(values: z.output<typeof addressFormSchema>) {
    if (!session?.user) return
    setBusy(true)
    setError("")
    try {
      const country = parsePhoneNumber(values.phone, "NG")?.country ?? "NG"
      const current = saved.data?.find((entry) => entry.id === editing?.id)
      const input = {
        label: values.label,
        delivery: deliverySchema.parse({
          name: values.recipient,
          phone: values.phone,
          address: values.line1,
          city: values.city,
          state: values.state,
          country,
          service: current?.delivery.service,
          postcode: current?.delivery.postcode ?? null,
        }),
      }
      if (editing) await updateAddress(editing.id, input)
      else {
        const createInput: AddressInput = {
          ...input,
          ...(saved.isSuccess && saved.data.length === 0
            ? { isDefault: true }
            : {}),
        }
        let alreadySaved = false
        if (pendingCreation.current) {
          const refreshed = await saved.refetch()
          if (!refreshed.data) {
            setError(
              "Could not check whether the address was saved. Try again when your address book loads."
            )
            return
          }
          createInput.isDefault = refreshed.data.length === 0 ? true : undefined
          const pending = pendingCreation.current
          const recovered = findCreatedAddress(
            refreshed.data,
            pending.previousIds,
            pending.input
          )
          pendingCreation.current = null
          alreadySaved = Boolean(
            recovered &&
            pending.input.label === createInput.label &&
            JSON.stringify(pending.input.delivery) ===
              JSON.stringify(createInput.delivery)
          )
        }
        if (!alreadySaved) {
          try {
            await createAddress(createInput)
          } catch (cause) {
            pendingCreation.current = {
              input: createInput,
              previousIds: saved.data?.map((entry) => entry.id) ?? [],
            }
            throw cause
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey })
      setOpen(false)
      toast.success("Address saved.")
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save address."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-7">
      <PageHeading
        title="Delivery addresses"
        description="Manage delivery addresses for future orders and choose your default."
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
      {saved.isPending ? (
        <p className="text-muted-foreground text-sm">Loading addresses…</p>
      ) : saved.isError ? (
        <p role="alert" className="text-destructive text-sm">
          Could not load addresses.{" "}
          <button className="underline" onClick={() => void saved.refetch()}>
            Try again
          </button>
        </p>
      ) : addresses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              onSetDefault={(id) => {
                const entry = saved.data?.find((item) => item.id === id)
                if (!entry || busy) return
                setBusy(true)
                void updateAddress(id, {
                  label: entry.label,
                  delivery: entry.delivery,
                  isDefault: true,
                })
                  .then(() => queryClient.invalidateQueries({ queryKey }))
                  .catch((cause) =>
                    toast.error(
                      cause instanceof Error
                        ? cause.message
                        : "Could not set the default address."
                    )
                  )
                  .finally(() => setBusy(false))
              }}
              onEdit={(id) => {
                setEditing(addresses.find((a) => a.id === id) ?? null)
                setOpen(true)
              }}
              onDelete={setRemove}
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
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl sm:p-0">
          <DialogHeader className="shrink-0 px-5 py-5 sm:px-6">
            <DialogTitle>
              {editing ? "Edit address" : "Add delivery address"}
            </DialogTitle>
            <DialogDescription>
              Enter the recipient and delivery details.
            </DialogDescription>
          </DialogHeader>
          <ValidatedForm
            key={editing?.id ?? "new"}
            schema={addressFormSchema}
            onSubmit={submit}
            className="flex min-h-0 flex-col overflow-hidden"
          >
            <div className="grid min-h-0 grid-cols-1 gap-x-5 gap-y-4 overflow-y-auto overscroll-contain px-5 pt-1 pb-5 sm:grid-cols-2 sm:px-6">
              {[
                {
                  name: "label",
                  label: "Address label",
                  value: editing?.label ?? "Home",
                  autoComplete: "off",
                },
                {
                  name: "recipient",
                  label: "Recipient name",
                  value: editing?.recipient ?? session?.user?.name,
                  autoComplete: "shipping name",
                },
                {
                  name: "phone",
                  label: "Phone number",
                  value: editing?.phone ?? session?.user?.phone,
                  autoComplete: "shipping tel",
                },
                {
                  name: "line1",
                  label: "Street address",
                  value: editing?.line1,
                  autoComplete: "shipping address-line1",
                },
                {
                  name: "city",
                  label: "City",
                  value: editing?.city,
                  autoComplete: "shipping address-level2",
                },
                {
                  name: "state",
                  label: "State",
                  value: editing?.state,
                  autoComplete: "shipping address-level1",
                },
              ].map((f) => (
                <FormInputField
                  key={f.name}
                  id={f.name}
                  name={f.name}
                  label={f.label}
                  defaultValue={f.value}
                  type={f.name === "phone" ? "tel" : "text"}
                  autoComplete={f.autoComplete}
                  inputClassName="h-11"
                  containerClassName={
                    f.name === "label" || f.name === "line1"
                      ? "min-w-0 sm:col-span-2"
                      : "min-w-0"
                  }
                  required
                />
              ))}
            </div>
            <DialogFooter className="shrink-0 flex-row px-5 py-4 sm:px-6 [&>button]:flex-1 sm:[&>button]:flex-none">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save address"}
              </Button>
            </DialogFooter>
            {error && (
              <p role="alert" className="text-destructive px-5 pb-4 text-sm">
                {error}
              </p>
            )}
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
              disabled={busy}
              onClick={async () => {
                if (!remove) return
                setBusy(true)
                try {
                  await deleteAddress(remove)
                  await queryClient.invalidateQueries({ queryKey })
                  setRemove(null)
                } catch (cause) {
                  toast.error(
                    cause instanceof Error
                      ? cause.message
                      : "Could not delete address."
                  )
                } finally {
                  setBusy(false)
                }
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
