"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Truck } from "lucide-react"
import AuthBoundary from "@/features/auth/components/auth-boundary"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { readSession } from "@/features/auth/api/session-store"
import { useCart } from "@/features/cart/hooks/use-cart"
import { CartSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import EmptyCart from "@/features/cart/components/store/empty-cart"
import { Button } from "@/components/ui/button"
import PhoneNumberField from "@/components/shared/form/signup-phone-field"
import parsePhoneNumber from "libphonenumber-js/min"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import { GettyApiError } from "@/lib/api/errors"
import {
  checkoutSchema,
  deliveryFromCheckoutForm,
  type CheckoutFormSchema,
} from "../../schemas/checkout-schema"
import {
  awaitingPayment,
  blockingCharge,
  hostedPaymentLink,
  money,
  placeOrder,
  previewCheckout,
  startPayment,
  type CheckoutPreview,
  type CheckoutCommand,
} from "../../api/checkout"
import {
  forgetCheckout,
  noteCheckoutIssue,
  readRecovery,
  rememberCheckout,
  rememberOrder,
  paymentOperation,
  rememberPayment,
} from "../../api/recovery"
import PaymentPanel from "../payment-panel"
import { nigeriaStates } from "../../nigeria-states"
import {
  createAddress,
  findCreatedAddress,
  getSavedAddresses,
  updateAddress,
  type AddressInput,
  type SavedAddress,
} from "../../api/addresses"

function formatDeliveryDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
}

function DeliveryStateField() {
  const country = useWatch({ name: "phoneCountry" })
  const normalizedCountry =
    typeof country === "string" ? country.trim().toUpperCase() : ""
  const previousCountry = useRef(normalizedCountry)
  const { setValue } = useFormContext()
  useEffect(() => {
    if (
      previousCountry.current &&
      previousCountry.current !== normalizedCountry
    )
      setValue("state", "")
    previousCountry.current = normalizedCountry
  }, [normalizedCountry, setValue])
  if (normalizedCountry && normalizedCountry !== "NG")
    return (
      <FormInputField
        name="state"
        label="State"
        autoComplete="shipping address-level1"
        required
      />
    )

  return (
    <div className="space-y-2">
      <label
        htmlFor="checkout-state"
        className="block text-sm font-medium text-[#414651]"
      >
        State{" "}
        <span aria-hidden className="text-destructive">
          *
        </span>
      </label>
      <FormSelect
        id="checkout-state"
        name="state"
        className="form-input h-13 border-[#dce2de] bg-white text-sm"
        autoComplete="shipping address-level1"
        required
      >
        <option value="">Select state or FCT</option>
        {nigeriaStates.map((state) => (
          <option key={state} value={state}>
            {state === "FCT" ? "Federal Capital Territory (FCT)" : state}
          </option>
        ))}
      </FormSelect>
    </div>
  )
}

export default function CheckoutPageContent() {
  const user = useAuthSession().data?.user
  return (
    <AuthBoundary roles={["customer"]}>
      <CheckoutStatus key={user?.id} />
    </AuthBoundary>
  )
}
function CheckoutStatus() {
  const router = useRouter()
  const state = useCart(),
    client = useQueryClient()
  const user = useAuthSession().data!.user!
  const addressesQuery = useQuery({
    queryKey: ["saved-addresses", user.id],
    queryFn: getSavedAddresses,
    refetchOnMount: "always",
  })
  const savedAddresses = useMemo(
    () => addressesQuery.data ?? [],
    [addressesQuery.data]
  )
  const defaultAddressId = savedAddresses.find(
    (address) => address.isDefault
  )?.id
  const [selectedAddress, setSelectedAddress] = useState("")
  const [formMode, setFormMode] = useState<"new" | "edit" | null>(null)
  const [addressLabel, setAddressLabel] = useState("")
  const [addressSaved, setAddressSaved] = useState(false)
  const pendingCreation = useRef<{
    input: AddressInput
    previousIds: string[]
  } | null>(null)
  const manualSelection = useRef(false)
  const [recovery, setRecovery] = useState(() => readRecovery(user.id))
  const [order, setOrder] = useState<string>()
  const [preview, setPreview] = useState<{
    data: CheckoutPreview
    signature: string
    notes: string | null
  }>()
  const [formValues, setFormValues] = useState<CheckoutFormSchema>({
    name: user.name,
    phone: user.phone ?? "",
    phoneCountry: parsePhoneNumber(user.phone ?? "")?.country ?? "NG",
    address: "",
    city: "",
    state: "",
    postcode: null,
    notes: "",
  })
  const [busy, setBusy] = useState(false)
  const [defaultUpdating, setDefaultUpdating] = useState(false)
  const [error, setError] = useState("")
  const [addressSaveWarning, setAddressSaveWarning] = useState("")
  const sending = useRef(false)
  const signature = JSON.stringify(state.cart)
  const ready = state.isReadyForCheckout
  const validPreview = preview && preview.signature === signature && ready
  const chooseAddress = useCallback(
    (addressId: string) => {
      setSelectedAddress(addressId)
      setFormMode(null)
      setAddressSaved(false)
      setError("")
      setAddressSaveWarning("")
      setPreview(undefined)
      const saved = savedAddresses.find((address) => address.id === addressId)
      if (!saved) {
        setAddressLabel("")
        setFormValues((current) => ({
          ...current,
          name: user.name,
          phone: user.phone ?? "",
          phoneCountry: parsePhoneNumber(user.phone ?? "")?.country ?? "NG",
          address: "",
          city: "",
          state: "",
          postcode: null,
          service: undefined,
        }))
        return
      }
      setAddressLabel(saved.label)
      const phoneCountry =
        parsePhoneNumber(saved.delivery.phone)?.country ??
        saved.delivery.country
      setFormValues((current) => ({
        ...current,
        name: saved.delivery.name,
        phone: saved.delivery.phone,
        phoneCountry,
        address: saved.delivery.address,
        city: saved.delivery.city,
        state:
          phoneCountry === "NG" &&
          saved.delivery.state.toLowerCase().includes("federal capital")
            ? "FCT"
            : saved.delivery.state,
        postcode: saved.delivery.postcode,
        service: saved.delivery.service,
      }))
    },
    [savedAddresses, user.name, user.phone]
  )
  useEffect(() => {
    if (
      !manualSelection.current &&
      !selectedAddress &&
      defaultAddressId &&
      addressesQuery.data?.some((address) => address.id === defaultAddressId)
    )
      chooseAddress(defaultAddressId)
  }, [addressesQuery.data, chooseAddress, defaultAddressId, selectedAddress])
  async function makeDefaultAddress() {
    const address = savedAddresses.find((entry) => entry.id === selectedAddress)
    if (!address || address.isDefault || defaultUpdating || busy) return
    setDefaultUpdating(true)
    setError("")
    try {
      await updateAddress(address.id, {
        label: address.label,
        delivery: address.delivery,
        isDefault: true,
      })
      await client.invalidateQueries({ queryKey: ["saved-addresses", user.id] })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not set the default address."
      )
    } finally {
      setDefaultUpdating(false)
    }
  }
  async function saveEditedAddress(values: CheckoutFormSchema) {
    const address = savedAddresses.find((entry) => entry.id === selectedAddress)
    if (!address || sending.current) return
    sending.current = true
    setBusy(true)
    setError("")
    try {
      const updated = await updateAddress(address.id, {
        label: addressLabel.trim() || address.label,
        delivery: deliveryFromCheckoutForm(values),
        isDefault: address.isDefault,
      })
      if (readSession().user?.id !== user.id) return
      setFormValues(values)
      setAddressLabel(updated.label)
      setFormMode(null)
      setAddressSaved(true)
      setPreview(undefined)
      client.setQueryData<SavedAddress[]>(
        ["saved-addresses", user.id],
        (current) =>
          (current ?? []).map((entry) =>
            entry.id === updated.id ? updated : entry
          )
      )
      void client.invalidateQueries({ queryKey: ["saved-addresses", user.id] })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update the address."
      )
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  async function quote(values: CheckoutFormSchema) {
    if (sending.current || defaultUpdating || !ready) return
    sending.current = true
    setBusy(true)
    setError("")
    setAddressSaveWarning("")
    setFormValues(values)
    try {
      const delivery = deliveryFromCheckoutForm(values)
      if (!selectedAddress) {
        const label =
          addressLabel.trim() ||
          (savedAddresses.length === 0
            ? "Home"
            : `Address ${savedAddresses.length + 1}`)
        const input: AddressInput = {
          label,
          delivery,
          ...(addressesQuery.isSuccess && savedAddresses.length === 0
            ? { isDefault: true }
            : {}),
        }
        let saved: SavedAddress | undefined
        if (pendingCreation.current) {
          try {
            const latest = await getSavedAddresses()
            if (readSession().user?.id !== user.id) return
            client.setQueryData(["saved-addresses", user.id], latest)
            input.isDefault = latest.length === 0 ? true : undefined
            const pending = pendingCreation.current
            const recovered = findCreatedAddress(
              latest,
              pending.previousIds,
              pending.input
            )
            pendingCreation.current = null
            if (
              recovered &&
              pending.input.label === input.label &&
              JSON.stringify(pending.input.delivery) ===
                JSON.stringify(input.delivery)
            )
              saved = recovered
          } catch {
            setAddressSaveWarning(
              "Getty could not confirm whether this address was saved for future orders. You can still use it for this order."
            )
          }
        }
        if (!saved && !pendingCreation.current) {
          try {
            saved = await createAddress(input)
          } catch {
            pendingCreation.current = {
              input,
              previousIds: savedAddresses.map((address) => address.id),
            }
            setAddressSaveWarning(
              "Getty could not confirm whether this address was saved for future orders. You can still use it for this order."
            )
          }
        }
        if (saved) {
          if (readSession().user?.id !== user.id) return
          client.setQueryData<SavedAddress[]>(
            ["saved-addresses", user.id],
            (current) => [
              ...(current ?? []).filter((a) => a.id !== saved.id),
              saved,
            ]
          )
          setSelectedAddress(saved.id)
          setAddressSaved(true)
          manualSelection.current = true
          void client.invalidateQueries({
            queryKey: ["saved-addresses", user.id],
          })
        }
      }
      const data = await previewCheckout(delivery)
      if (readSession().user?.id === user.id) {
        setPreview({ data, signature, notes: values.notes || null })
        setFormMode(null)
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t price this delivery. Please try again."
      )
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  async function submit(saved?: CheckoutCommand) {
    if (sending.current || (!saved && !validPreview)) return
    sending.current = true
    setBusy(true)
    setError("")
    try {
      const command = saved ?? {
        token: crypto.randomUUID(),
        cart: preview!.data.cart,
        quote: preview!.data.quote,
        delivery: preview!.data.delivery,
        notes: preview!.notes,
      }
      setRecovery(rememberCheckout(user.id, command))
      const result = await placeOrder(command)
      rememberOrder(user.id, result.id)
      if (readSession().user?.id !== user.id) return
      void client.invalidateQueries({ queryKey: ["cart", user.id] })
      void client.invalidateQueries({ queryKey: ["orders"] })
      let continuePayment = Boolean(blockingCharge(result))
      let immediateLink: string | null = null
      if (!continuePayment && awaitingPayment(result)) {
        try {
          const operation = paymentOperation(user.id, result.id)
          const payment = await startPayment(result.id, operation.token)
          rememberPayment(user.id, result.id, operation.token, payment.id)
          continuePayment = true
          immediateLink = hostedPaymentLink(result, payment)
        } catch {
          // The order is already placed. The payment page can safely recover
          // the saved operation or show a retry without another checkout.
        }
      }
      if (readSession().user?.id !== user.id) return
      if (immediateLink) {
        window.location.assign(immediateLink)
        return
      }
      setOrder(result.id)
      router.push(
        `/checkout/payment?order=${encodeURIComponent(result.id)}${continuePayment ? "&continue=1" : ""}`
      )
    } catch (e) {
      const definitive =
        e instanceof GettyApiError &&
        [400, 409, 422].includes(e.status) &&
        !/token|idempoten/i.test(e.message)
      if (definitive) {
        setRecovery(forgetCheckout(user.id))
        setPreview(undefined)
        void state.refetch()
      }
      const message = definitive
        ? `${e.message} Review your bag and request an updated delivery total before placing the order again.`
        : e instanceof Error
          ? e.message
          : "We couldn’t confirm your order. Retry the saved request to avoid placing it twice."
      if (!definitive) {
        try {
          setRecovery(noteCheckoutIssue(user.id, message))
        } catch {
          // The current error remains visible even if storage is unavailable.
        }
      }
      setError(message)
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  if (order)
    return (
      <div className="site-container py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <PaymentPanel orderId={order} autoContinue />
        </div>
      </div>
    )
  if (recovery.command)
    return (
      <div className="site-container py-12">
        <section className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Finish checking your order</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            We saved your checkout request before sending it, but Getty has not
            confirmed the result. Retry the same request to recover your order
            safely. This will not place a second order for the same request.
          </p>
          <p className="mt-4 text-sm">
            Deliver to {recovery.command.delivery.name},{" "}
            {recovery.command.delivery.address},{" "}
            {recovery.command.delivery.city}.
          </p>
          {(error || recovery.issue) && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error || recovery.issue}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={() => void submit(recovery.command)}
            >
              {busy ? "Checking order…" : "Check saved order request"}
            </Button>
            <Link
              href="/customer/orders"
              className="text-primary inline-flex min-h-12 items-center px-3"
            >
              View your orders
            </Link>
          </div>
        </section>
      </div>
    )
  if (state.isPending) return <CartSkeleton />
  if (state.isError)
    return (
      <div className="site-container py-12">
        <ContentError
          title="Your bag is temporarily unavailable"
          onRetry={() => void state.refetch()}
        />
      </div>
    )
  if (state.syncError && !state.cart.items.length)
    return (
      <div className="site-container py-12">
        <section className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-semibold">Review your saved bag</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Some items couldn’t be added to your account. Review their
            availability and quantities before continuing.
          </p>
          <Link
            href="/cart"
            className="text-primary mt-5 inline-flex min-h-11 items-center font-semibold"
          >
            Review bag
          </Link>
        </section>
      </div>
    )
  if (!state.cart.items.length)
    return (
      <div className="site-container py-12">
        {recovery.order ? (
          <div className="mx-auto max-w-2xl">
            <PaymentPanel orderId={recovery.order} returnPage />
          </div>
        ) : (
          <EmptyCart />
        )}
      </div>
    )
  return (
    <div className="site-container py-8 sm:py-12">
      <Link
        href="/cart"
        className="text-primary inline-flex min-h-11 items-center gap-2 text-sm"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to your bag
      </Link>
      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Add your delivery details, then review your total before placing the
          order.
        </p>
      </div>
      {recovery.order && (
        <p className="mb-6 rounded-xl border bg-white p-4 text-sm">
          Have an earlier order to finish?{" "}
          <Link
            href={`/checkout/callback?order=${recovery.order}`}
            className="text-primary underline"
          >
            Check its payment status
          </Link>
          .
        </p>
      )}
      {!ready && (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          {state.syncError
            ? "Review unavailable items or finish syncing your bag before checking out."
            : state.isUpdating
              ? "Your bag is updating. Please wait before continuing."
              : "Review unavailable items or finish syncing your bag before checking out."}{" "}
          <Link className="underline" href="/cart">
            Review bag
          </Link>
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {addressSaveWarning && (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          {addressSaveWarning}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.65fr)]">
        <section className="min-w-0 rounded-2xl border bg-white p-5 sm:p-8">
          <h2 className="flex items-center gap-3 text-xl font-semibold">
            <Truck aria-hidden className="text-primary size-5" /> Delivery
            details
          </h2>
          {preview ? (
            <div className="mt-6 text-sm leading-7">
              <p className="font-semibold">{preview.data.delivery.name}</p>
              <p>{preview.data.delivery.phone}</p>
              <p>{preview.data.delivery.address}</p>
              <p>
                {preview.data.delivery.city}, {preview.data.delivery.state},{" "}
                {preview.data.delivery.country} {preview.data.delivery.postcode}
              </p>
              {preview.notes && (
                <p className="mt-3 whitespace-pre-wrap">
                  Delivery note: {preview.notes}
                </p>
              )}
              <Button
                variant="outline"
                className="mt-5"
                disabled={busy}
                onClick={() => {
                  setPreview(undefined)
                  setFormMode(selectedAddress ? "edit" : "new")
                }}
              >
                Edit delivery details
              </Button>
              {!validPreview && (
                <p role="alert" className="mt-4 text-amber-800">
                  Your bag has changed. Review the updated delivery total before
                  continuing.
                </p>
              )}
            </div>
          ) : (
            <div>
              {!formMode && (
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    className="text-primary min-h-10 text-sm font-medium hover:underline"
                    disabled={busy}
                    onClick={() => {
                      manualSelection.current = true
                      chooseAddress("")
                      setFormMode("new")
                    }}
                  >
                    Add new address
                  </button>
                </div>
              )}
              {addressesQuery.isPending && (
                <p className="text-muted-foreground mt-5 text-sm">
                  Loading saved addresses…
                </p>
              )}
              {addressesQuery.isError && (
                <p role="alert" className="mt-5 text-sm text-red-700">
                  Saved addresses could not be loaded. You can add a new address
                  or{" "}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => void addressesQuery.refetch()}
                  >
                    try again
                  </button>
                  .
                </p>
              )}
              {savedAddresses.length > 0 && (
                <div className="mb-5 space-y-2">
                  <label
                    htmlFor="checkout-saved-address"
                    className="block text-sm font-medium text-[#414651]"
                  >
                    Saved delivery address
                  </label>
                  <select
                    id="checkout-saved-address"
                    value={selectedAddress}
                    onChange={(event) => {
                      manualSelection.current = true
                      chooseAddress(event.target.value)
                    }}
                    className="form-input h-13 w-full border-[#dce2de] bg-white pr-10 text-sm"
                  >
                    <option value="">Select a saved address</option>
                    {savedAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label}
                        {address.id === defaultAddressId
                          ? " (Default)"
                          : ""} — {address.delivery.address},{" "}
                        {address.delivery.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {addressSaved && (
                <p role="status" className="mt-4 text-sm text-[#167b54]">
                  Address saved and selected for this delivery.
                </p>
              )}
              {selectedAddress && !formMode && (
                <div className="mt-5 space-y-4 text-sm leading-6">
                  <div>
                    <p className="font-semibold">{formValues.name}</p>
                    <p>{formValues.phone}</p>
                    <p>{formValues.address}</p>
                    <p>
                      {formValues.city}, {formValues.state},{" "}
                      {
                        savedAddresses.find(
                          (entry) => entry.id === selectedAddress
                        )?.delivery.country
                      }
                      {formValues.postcode ? ` ${formValues.postcode}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <button
                      type="button"
                      className="text-primary min-h-10 font-medium hover:underline"
                      disabled={busy}
                      onClick={() => setFormMode("edit")}
                    >
                      Edit address
                    </button>
                    <button
                      type="button"
                      className="text-primary min-h-10 font-medium hover:underline disabled:cursor-default disabled:text-[#66786c] disabled:no-underline"
                      disabled={
                        selectedAddress === defaultAddressId ||
                        defaultUpdating ||
                        busy
                      }
                      onClick={() => void makeDefaultAddress()}
                    >
                      {selectedAddress === defaultAddressId
                        ? "Default address"
                        : defaultUpdating
                          ? "Saving default…"
                          : "Make default address"}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={!ready || busy || defaultUpdating}
                      onClick={() => void quote(formValues)}
                    >
                      {busy
                        ? "Calculating delivery…"
                        : "Review delivery & total"}
                    </Button>
                  </div>
                </div>
              )}
              {!selectedAddress && !formMode && !addressesQuery.isPending && (
                <p className="text-muted-foreground mt-5 text-sm">
                  Add a delivery address to review your total.
                </p>
              )}
              {formMode && (
                <ValidatedForm
                  key={`${formMode}-${selectedAddress}`}
                  schema={checkoutSchema}
                  defaultValues={formValues}
                  onSubmit={formMode === "edit" ? saveEditedAddress : quote}
                  onChangeCapture={() => {
                    manualSelection.current = true
                  }}
                  className="mt-6 space-y-5"
                >
                  <fieldset disabled={busy} className="space-y-5">
                    <FormInputField
                      name="name"
                      label="Recipient name"
                      autoComplete="shipping name"
                      required
                    />
                    <PhoneNumberField
                      countryName="phoneCountry"
                      autoComplete="shipping tel-national"
                    />
                    <FormInputField
                      name="address"
                      label="Street address"
                      autoComplete="shipping street-address"
                      required
                    />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormInputField
                        name="city"
                        label="City"
                        autoComplete="shipping address-level2"
                        required
                      />
                      <DeliveryStateField />
                    </div>
                    <FormInputField
                      name="postcode"
                      label="Postal code (optional)"
                      autoComplete="shipping postal-code"
                    />
                    <div className="space-y-2">
                      <label
                        htmlFor="checkout-delivery-note"
                        className="block text-sm font-medium text-[#414651]"
                      >
                        Delivery note (optional)
                      </label>
                      <FormTextarea
                        id="checkout-delivery-note"
                        name="notes"
                        rows={3}
                        placeholder="Directions or instructions for your delivery"
                        className="focus-visible:border-primary focus-visible:ring-primary/10 min-h-28 resize-y rounded-lg border-[#dce2de] bg-white px-3.5 py-3 text-base font-normal shadow-none transition-[border-color,box-shadow] placeholder:text-[#8b938e] hover:border-[#bac7be] focus-visible:ring-3 sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="checkout-address-label"
                        className="block text-sm font-medium text-[#414651]"
                      >
                        Address label (optional)
                      </label>
                      <input
                        id="checkout-address-label"
                        className="form-input h-13 border-[#dce2de] bg-white text-sm"
                        value={addressLabel}
                        onChange={(event) =>
                          setAddressLabel(event.target.value)
                        }
                        placeholder="Home, office or hospital"
                        maxLength={80}
                      />
                      <p className="text-muted-foreground text-xs">
                        Leave blank to use{" "}
                        {formMode === "edit"
                          ? (savedAddresses.find(
                              (entry) => entry.id === selectedAddress
                            )?.label ?? "the current label")
                          : savedAddresses.length
                            ? `Address ${savedAddresses.length + 1}`
                            : "Home"}
                        .
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (formMode === "new" && defaultAddressId)
                            chooseAddress(defaultAddressId)
                          else {
                            if (formMode === "edit")
                              setAddressLabel(
                                savedAddresses.find(
                                  (entry) => entry.id === selectedAddress
                                )?.label ?? ""
                              )
                            setFormMode(null)
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!ready || busy || defaultUpdating}
                      >
                        {busy
                          ? formMode === "edit"
                            ? "Saving changes…"
                            : "Saving address & calculating delivery…"
                          : formMode === "edit"
                            ? "Save address changes"
                            : "Save address & review total"}
                      </Button>
                    </div>
                  </fieldset>
                </ValidatedForm>
              )}
            </div>
          )}
        </section>
        <aside className="min-w-0 rounded-2xl border bg-white p-5 sm:p-8">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <ul className="mt-5 divide-y">
            {(validPreview
              ? preview.data.items.map((item) => ({
                  id: item.variant,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                }))
              : state.cart.items.map((item) => ({
                  id: item.variantId,
                  name: item.product.name,
                  quantity: item.quantity,
                  price: item.product.price,
                }))
            ).map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium [overflow-wrap:anywhere]">
                    {item.name}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Quantity {item.quantity} · {money(item.price)} each
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-4 border-t pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Products (tax included)</dt>
              <dd>
                {money(
                  validPreview ? preview.data.subtotal : state.cart.subtotal
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd>
                {validPreview
                  ? money(preview.data.shipping)
                  : "Awaiting address"}
              </dd>
            </div>
            {validPreview && preview.data.deliveryQuote && (
              <div className="rounded-lg bg-[#f6f9f3] px-4 py-3 text-xs leading-5 text-[#526459]">
                {preview.data.deliveryQuote.earliest &&
                  preview.data.deliveryQuote.latest && (
                    <p>
                      Estimated delivery:{" "}
                      {formatDeliveryDate(preview.data.deliveryQuote.earliest)}{" "}
                      – {formatDeliveryDate(preview.data.deliveryQuote.latest)}
                    </p>
                  )}
                {preview.data.deliveryQuote.estimatedMeasurements && (
                  <p>Shipping is based on estimated package measurements.</p>
                )}
                {preview.data.deliveryQuote.estimateOnly &&
                  !preview.data.deliveryQuote.estimatedMeasurements && (
                    <p>This delivery estimate is provisional.</p>
                  )}
              </div>
            )}
            {validPreview && (
              <div className="flex justify-between gap-4 border-t pt-4 text-lg font-semibold">
                <dt>Total</dt>
                <dd>{money(preview.data.total)}</dd>
              </div>
            )}
          </dl>
          {validPreview && (
            <Button
              disabled={busy}
              className="mt-6 w-full"
              onClick={() => void submit()}
            >
              {busy ? "Preparing payment…" : "Proceed to payment"}
            </Button>
          )}
          {preview && !validPreview && (
            <Button
              className="mt-6 w-full"
              disabled={busy || !ready}
              onClick={() => void quote(formValues)}
            >
              Update delivery total
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}
