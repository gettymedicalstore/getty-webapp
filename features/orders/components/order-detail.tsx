"use client"
import { useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, Package, RotateCcw } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { syncSession } from "@/features/auth/api/session-store"
import { currentSession } from "@/features/auth/api/refresh-session"
import { GettyApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ValidatedForm,
  FormInputField,
  FormSelect,
  FormTextarea,
} from "@/components/shared/form/validated-form"
import PageHeading from "@/components/shared/page-heading"
import ContentError from "@/components/shared/content-error"
import { OrdersSkeleton } from "@/components/shared/loading-skeletons"
import StatusBadge from "@/components/admin/shared/status-badge"
import { formatOrderAmount as formatCurrency } from "../utils/format-order-amount"
import {
  getOrder,
  actOnOrderLine,
  cancelOrder,
  availableLineActions,
  type ManagedOrder,
  type OrderLine,
  type OrderAction,
} from "../api/order-management"
import {
  prepareOrderAction,
  clearOrderAction,
  pendingOrderAction,
} from "../api/action-recovery"

const actionLabels: Record<OrderAction | "cancel-order", string> = {
  accept: "Accept item",
  ship: "Mark as shipped",
  deliver: "Confirm delivery",
  cancel: "Cancel item",
  "request-return": "Request return",
  "approve-return": "Approve return",
  "reject-return": "Reject return",
  "receive-return": "Receive return",
  "cancel-order": "Cancel order",
}
type SelectedAction = { action: OrderAction | "cancel-order"; line?: OrderLine }
function ActionDialog({
  order,
  selection,
  workspace,
  onClose,
  onUpdated,
}: {
  order: ManagedOrder
  selection: SelectedAction
  workspace: "customer" | "supplier" | "admin"
  onClose: () => void
  onUpdated: () => Promise<unknown>
}) {
  const { data: session } = useAuthSession()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false)
  const running = useRef(false)
  const [expectedSession] = useState(syncSession)
  const scope = `${expectedSession.user?.id}:${order.id}:${selection.line?.id ?? "order"}:${selection.action}`
  const [pending, setPending] = useState(() => {
    try {
      return pendingOrderAction(scope)
    } catch {
      return null
    }
  })
  const action = selection.action,
    reasonRequired = action.includes("cancel") || action.includes("return")
  const schema = z.object({
    reason: reasonRequired
      ? z.string().trim().min(1, "Enter a reason.").max(1000)
      : z.string().optional(),
    carrier:
      action === "ship"
        ? z.string().trim().min(1, "Enter the carrier.").max(100)
        : z.string().optional(),
    tracking:
      action === "ship"
        ? z.string().trim().min(1, "Enter the tracking number.").max(200)
        : z.string().optional(),
    restock:
      action === "receive-return"
        ? z.enum(["true", "false"], {
            error: "Choose a stock decision after inspection.",
          })
        : z.string().optional(),
  })
  async function submit(values: z.infer<typeof schema>) {
    if (running.current || !session?.user || conflict) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      currentSession(expectedSession)
      const version =
        typeof pending?.version === "number"
          ? pending.version
          : (selection.line?.version ?? order.version)
      if (!version)
        throw new Error("Refresh the order to load its current revision.")
      if (action === "cancel-order") {
        const body = prepareOrderAction(scope, {
          version,
          reason: values.reason!,
        })
        setPending(body)
        currentSession(expectedSession)
        await cancelOrder(order.id, body)
      } else {
        const body = prepareOrderAction(scope, {
          version,
          action,
          ...(reasonRequired ? { reason: values.reason } : {}),
          ...(action === "ship"
            ? { carrier: values.carrier, tracking: values.tracking }
            : {}),
          ...(action === "receive-return"
            ? { restock: values.restock === "true" }
            : {}),
        })
        setPending(body)
        currentSession(expectedSession)
        await actOnOrderLine(
          workspace === "customer" ? "customer" : "vendor",
          order.id,
          selection.line!.id,
          body
        )
      }
      currentSession(expectedSession)
      clearOrderAction(scope)
      toast.success(
        action.includes("cancel")
          ? "Cancellation recorded. Any refund will be processed separately."
          : "Order updated."
      )
      await onUpdated()
      onClose()
    } catch (cause) {
      if (syncSession().sessionId !== expectedSession.sessionId) {
        setError(
          "Your account changed. This action is saved under the original account; sign back in to check it."
        )
        return
      }
      if (
        cause instanceof GettyApiError &&
        [400, 403, 404, 409, 422].includes(cause.status)
      ) {
        clearOrderAction(scope)
        setPending(null)
      }
      if (cause instanceof GettyApiError && cause.status === 409) {
        clearOrderAction(scope)
        setConflict(true)
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn’t confirm the update. Retry the same action."
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>{actionLabels[action]}</DialogTitle>
        <DialogDescription>
          {selection.line?.name ?? order.reference}.{" "}
          {action === "ship"
            ? "Add the carrier and tracking number for this entire item quantity."
            : action === "receive-return"
              ? "Confirm the returned items were received and inspected before choosing whether to restock."
              : action.includes("cancel")
                ? "This cancels the entire quantity. Eligible refunds are processed separately."
                : "Confirm this change to the order."}
        </DialogDescription>
        <ValidatedForm
          schema={schema}
          defaultValues={{
            reason: String(pending?.reason ?? ""),
            carrier: String(pending?.carrier ?? ""),
            tracking: String(pending?.tracking ?? ""),
            restock:
              pending?.restock === undefined ? "" : String(pending.restock),
          }}
          onSubmit={submit}
          className="space-y-4"
        >
          <fieldset
            disabled={busy || conflict || Boolean(pending)}
            className="space-y-4"
          >
            {reasonRequired && (
              <div>
                <label
                  htmlFor="order-action-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Reason
                </label>
                <FormTextarea
                  id="order-action-reason"
                  name="reason"
                  className="min-h-24"
                />
              </div>
            )}
            {action === "ship" && (
              <>
                <FormInputField
                  id="order-carrier"
                  name="carrier"
                  label="Carrier"
                />
                <FormInputField
                  id="order-tracking"
                  name="tracking"
                  label="Tracking number"
                />
              </>
            )}
            {action === "receive-return" && (
              <div>
                <label
                  htmlFor="order-restock"
                  className="mb-2 block text-sm font-medium"
                >
                  Stock decision
                </label>
                <FormSelect
                  className="form-input"
                  id="order-restock"
                  name="restock"
                >
                  <option value="">Choose after inspection</option>
                  <option value="false">Do not return to stock</option>
                  <option value="true">
                    Safe for resale — return to stock
                  </option>
                </FormSelect>
              </div>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
              {conflict
                ? " Refresh and review the latest order before trying again."
                : " If the connection was interrupted, retrying the same values is safe."}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Close
            </Button>
            {conflict ? (
              <Button
                type="button"
                onClick={async () => {
                  await onUpdated()
                  onClose()
                }}
              >
                Refresh order
              </Button>
            ) : (
              <Button type="submit" disabled={busy}>
                {busy ? "Updating…" : actionLabels[action]}
              </Button>
            )}
          </DialogFooter>
        </ValidatedForm>
      </DialogContent>
    </Dialog>
  )
}
export default function OrderDetail({
  orderId,
  workspace,
}: {
  orderId: string
  workspace: "customer" | "supplier" | "admin"
}) {
  const { data: session } = useAuthSession(),
    client = useQueryClient()
  const audience = workspace === "customer" ? "customer" : "vendor"
  const [selection, setSelection] = useState<SelectedAction | null>(null)
  const [tab, setTab] = useState("items")
  const query = useQuery({
    queryKey: ["order", session?.user?.id, audience, orderId],
    queryFn: () => getOrder(audience, orderId),
    enabled: Boolean(session?.user),
  })
  const refresh = async () => {
    await Promise.all([
      query.refetch(),
      client.invalidateQueries({ queryKey: ["orders"] }),
    ])
  }
  if (query.isPending) return <OrdersSkeleton />
  if (query.isError)
    return (
      <ContentError
        title="We couldn’t load this order"
        description={query.error.message}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    )
  const order = query.data,
    date = (value: string) =>
      new Date(value).toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      })
  const cancellable =
    audience === "customer" &&
    order.version &&
    !["cancelled", "expired", "completed"].includes(order.status) &&
    order.items.some((line) => line.status === "pending") &&
    order.items.every((line) => ["pending", "cancelled"].includes(line.status))
  const tabs = [
    "items",
    "delivery",
    ...(audience === "customer" ? ["payments"] : []),
    "history",
  ]
  return (
    <div className="min-w-0 space-y-6">
      <Link
        href={`/${workspace}/orders`}
        className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to orders
      </Link>
      <PageHeading
        title={order.reference}
        description={`Placed ${date(order.placed)} · Africa/Lagos`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <Button
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RotateCcw className="size-4" aria-hidden />
              Refresh
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-muted-foreground text-sm">
            {audience === "vendor" ? "Your items’ order value" : "Order total"}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(order.total, order.currency)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Before any refunds
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-muted-foreground text-sm">Delivery fee</p>
          <p className="mt-2 text-2xl font-semibold">
            {order.shipping == null
              ? "—"
              : formatCurrency(order.shipping, order.currency)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-muted-foreground text-sm">
            {audience === "vendor" ? "Commission" : "Items"}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {audience === "vendor"
              ? order.commission == null
                ? "—"
                : formatCurrency(order.commission, order.currency)
              : order.items.reduce((sum, line) => sum + line.quantity, 0)}
          </p>
          {audience === "vendor" && (
            <p className="text-muted-foreground mt-1 text-xs">
              Original allocation; this is not a payout balance.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {audience === "customer" && order.status === "pending" && (
          <Link
            href={`/checkout/callback?order=${encodeURIComponent(order.id)}`}
            className="bg-primary inline-flex min-h-11 items-center rounded-lg px-5 font-semibold text-white"
          >
            Continue to payment
          </Link>
        )}
        {cancellable && (
          <Button
            variant="outline"
            onClick={() => setSelection({ action: "cancel-order" })}
          >
            Cancel order
          </Button>
        )}
      </div>
      <div
        className="flex gap-1 overflow-x-auto border-b"
        role="tablist"
        aria-label="Order details"
      >
        {tabs.map((value) => (
          <button
            key={value}
            id={`order-tab-${value}`}
            aria-controls={`order-panel-${value}`}
            role="tab"
            type="button"
            aria-selected={tab === value}
            className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-medium capitalize ${tab === value ? "border-primary text-primary" : "text-muted-foreground border-transparent"}`}
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              if (
                ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault()
                const index = tabs.indexOf(value)
                const next =
                  event.key === "Home"
                    ? tabs[0]
                    : event.key === "End"
                      ? tabs[tabs.length - 1]
                      : tabs[
                          (index +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            tabs.length) %
                            tabs.length
                        ]
                setTab(next)
                document.getElementById(`order-tab-${next}`)?.focus()
              }
            }}
            tabIndex={tab === value ? 0 : -1}
          >
            {value}
          </button>
        ))}
      </div>
      <section
        id={`order-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`order-tab-${tab}`}
        className="space-y-4"
      >
        {tab === "items" &&
          order.items.map((line) => (
            <article
              key={line.id}
              className="rounded-xl border bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold">{line.name}</h2>
                  <p className="text-muted-foreground mt-1 text-sm break-all">
                    SKU {line.sku}
                  </p>
                  <p className="mt-2 text-sm">
                    {line.quantity} ×{" "}
                    {formatCurrency(line.price, order.currency)} · {line.unit}
                    {line.pack > 1 ? ` of ${line.pack}` : ""}
                  </p>
                </div>
                <div className="space-y-2">
                  <StatusBadge status={line.status} />
                  <p className="font-semibold">
                    {formatCurrency(line.total, order.currency)}
                  </p>
                </div>
              </div>
              {line.returnstate !== "none" && (
                <p className="mt-3 text-sm">
                  Return:{" "}
                  <span className="font-medium capitalize">
                    {line.returnstate}
                  </span>
                </p>
              )}
              {line.tracking &&
                (line.tracking.carrier ||
                  line.tracking.tracking ||
                  line.tracking.number) && (
                  <p className="mt-3 text-sm break-all">
                    Carrier: {line.tracking.carrier ?? "—"} · Tracking:{" "}
                    {line.tracking.tracking ?? line.tracking.number ?? "—"}
                  </p>
                )}
              <div className="mt-4 flex flex-wrap gap-2">
                {availableLineActions(audience, order, line).map((action) => (
                  <Button
                    key={action}
                    variant="outline"
                    onClick={() => setSelection({ action, line })}
                  >
                    {actionLabels[action]}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        {tab === "delivery" && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 font-semibold">Delivery contact</h2>
            <address className="space-y-2 text-sm not-italic">
              <p>{order.delivery.name}</p>
              <p>{order.delivery.phone}</p>
              <p>{order.delivery.address}</p>
              <p>
                {[
                  order.delivery.city,
                  order.delivery.state,
                  order.delivery.postcode,
                  order.delivery.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </address>
            {order.notes && (
              <p className="mt-5 text-sm">Order note: {order.notes}</p>
            )}
          </div>
        )}
        {tab === "payments" && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold">Payment history</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              A pending payment or refund is still being processed. Only
              succeeded entries are settled.
            </p>
            {!order.payments?.length ? (
              <p className="mt-6 text-sm">No payment attempts recorded.</p>
            ) : (
              <ul className="mt-5 divide-y">
                {order.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium capitalize">
                        {payment.kind} · {payment.status}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {payment.settled
                          ? date(payment.settled)
                          : "Not settled"}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {tab === "history" && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold">Order history</h2>
            {!order.history?.length ? (
              <p className="text-muted-foreground mt-4 text-sm">
                No history entries yet.
              </p>
            ) : (
              <ol className="mt-4 divide-y">
                {order.history.map((event) => (
                  <li className="py-4" key={event.id}>
                    <p className="font-medium capitalize">
                      {event.action.replaceAll("-", " ")}
                      {event.after ? ` · ${event.after}` : ""}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {date(event.entry)}
                    </p>
                    {event.reason && (
                      <p className="mt-2 text-sm">{event.reason}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        {tab === "items" && !order.items.length && (
          <p className="rounded-xl border bg-white p-6">
            <Package className="mb-3 size-5" aria-hidden />
            No items returned for this order.
          </p>
        )}
      </section>
      {selection && (
        <ActionDialog
          order={order}
          selection={selection}
          workspace={workspace}
          onClose={() => setSelection(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  )
}
