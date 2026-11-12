"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
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
  money,
  placeOrder,
  previewCheckout,
  type CheckoutPreview,
  type CheckoutCommand,
} from "../../api/checkout"
import {
  forgetCheckout,
  noteCheckoutIssue,
  readRecovery,
  rememberCheckout,
  rememberOrder,
} from "../../api/recovery"
import PaymentPanel from "../payment-panel"
import { nigeriaStates } from "../../nigeria-states"

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
  const [error, setError] = useState("")
  const sending = useRef(false)
  const signature = JSON.stringify(state.cart)
  const ready = state.isReadyForCheckout
  const validPreview = preview && preview.signature === signature && ready
  async function quote(values: CheckoutFormSchema) {
    if (sending.current || !ready) return
    sending.current = true
    setBusy(true)
    setError("")
    setFormValues(values)
    try {
      const data = await previewCheckout(deliveryFromCheckoutForm(values))
      if (readSession().user?.id === user.id)
        setPreview({ data, signature, notes: values.notes || null })
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
      setOrder(result.id)
      router.push(`/checkout/payment?order=${encodeURIComponent(result.id)}`)
      void client.invalidateQueries({ queryKey: ["cart", user.id] })
      void client.invalidateQueries({ queryKey: ["orders"] })
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
          <PaymentPanel orderId={order} />
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
                onClick={() => setPreview(undefined)}
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
            <ValidatedForm
              schema={checkoutSchema}
              defaultValues={formValues}
              onSubmit={quote}
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
                <Button
                  type="submit"
                  disabled={!ready || busy}
                  className="w-full sm:w-auto"
                >
                  {busy ? "Calculating delivery…" : "Review delivery & total"}
                </Button>
              </fieldset>
            </ValidatedForm>
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
              {busy ? "Placing order…" : "Place order"}
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
