"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, LockKeyhole, Truck } from "lucide-react"
import AuthBoundary from "@/features/auth/components/auth-boundary"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { readSession } from "@/features/auth/api/session-store"
import { useCart } from "@/features/cart/hooks/use-cart"
import { CartSkeleton } from "@/components/shared/loading-skeletons"
import ContentError from "@/components/shared/content-error"
import EmptyCart from "@/features/cart/components/store/empty-cart"
import { Button } from "@/components/ui/button"
import {
  ValidatedForm,
  FormInputField,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import { GettyApiError } from "@/lib/api/errors"
import {
  checkoutSchema,
  deliverySchema,
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
  readRecovery,
  rememberCheckout,
  rememberOrder,
} from "../../api/recovery"
import PaymentPanel from "../payment-panel"

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
    address: "",
    city: "",
    state: "",
    country: "NG",
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
      const data = await previewCheckout(deliverySchema.parse(values))
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
      setError(
        definitive
          ? `${e.message} Review your bag and request an updated delivery total before placing the order again.`
          : e instanceof Error
            ? e.message
            : "We couldn’t confirm your order. Retry the saved request to avoid placing it twice."
      )
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
          <h1 className="text-2xl font-semibold">Check your order request</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Your last order request is saved, but its outcome has not been
            confirmed. Retry the same request to recover the order safely.
          </p>
          <p className="mt-4 text-sm">
            Deliver to {recovery.command.delivery.name},{" "}
            {recovery.command.delivery.address},{" "}
            {recovery.command.delivery.city}.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={() => void submit(recovery.command)}
            >
              {busy ? "Checking order…" : "Retry saved order request"}
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
                <FormInputField
                  name="phone"
                  label="Phone number"
                  type="tel"
                  autoComplete="shipping tel"
                  required
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
                  <FormInputField
                    name="state"
                    label="State / FCT"
                    autoComplete="shipping address-level1"
                    required
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormInputField
                    name="country"
                    label="Country code"
                    hint="Two letters, for example NG for Nigeria."
                    autoComplete="shipping country"
                    required
                  />
                  <FormInputField
                    name="postcode"
                    label="Postal code (optional)"
                    autoComplete="shipping postal-code"
                  />
                </div>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Delivery note (optional)</span>
                  <FormTextarea
                    name="notes"
                    rows={3}
                    placeholder="Directions or instructions for your delivery"
                  />
                </label>
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
          <p className="text-muted-foreground mt-5 flex gap-2 text-xs leading-5">
            <LockKeyhole aria-hidden className="mt-0.5 size-4 shrink-0" />{" "}
            Payment is completed securely with Paystack after your order is
            placed.
          </p>
        </aside>
      </div>
    </div>
  )
}
