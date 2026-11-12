"use client"

import { useRef, useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FormInput,
  FormInputField,
  FormTextarea,
  ValidatedForm,
} from "@/components/shared/form/validated-form"
import { syncSession } from "@/features/auth/api/session-store"
import { currentSession } from "@/features/auth/api/refresh-session"
import { GettyApiError } from "@/lib/api/client"
import {
  clearOrderAction,
  pendingOrderAction,
  prepareOrderAction,
} from "../api/action-recovery"
import {
  postFulfilmentAction,
  postSupplyAction,
  type FulfilmentAction,
  type OperationsOrder,
  type SupplyAction,
} from "../api/fulfilment"
import type { ManagedOrder } from "../api/order-management"

export type WorkflowSelection = {
  action: FulfilmentAction | SupplyAction
  itemId?: string
  version: number
  itemName?: string
}

const labels: Record<WorkflowSelection["action"], string> = {
  preparing: "Start preparing order",
  ready: "Mark order ready",
  dispatch: "Dispatch order",
  deliver: "Confirm delivery",
  accept: "Accept supply request",
  supply: "Record physical handover",
  receive: "Confirm Getty receipt",
  "return-to-vendor": "Return to supplier",
}

export default function FulfilmentActionDialog({
  orderId,
  selection,
  audience,
  onClose,
  onSuccess,
  onRefresh,
}: {
  orderId: string
  selection: WorkflowSelection
  audience: "customer" | "vendor" | "operations"
  onClose: () => void
  onSuccess: (result: ManagedOrder | OperationsOrder) => void
  onRefresh: () => Promise<unknown>
}) {
  const [expectedSession] = useState(syncSession)
  const scope = `${expectedSession.sessionId}:${orderId}:${selection.itemId ?? "whole-order"}:${selection.action}`
  const [pending, setPending] = useState(() => {
    try {
      return pendingOrderAction(scope)
    } catch {
      return null
    }
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [conflict, setConflict] = useState(false)
  const running = useRef(false)
  const action = selection.action
  const dispatch = action === "dispatch"
  const staffDelivery = action === "deliver" && audience === "operations"
  const referenceRequired = ["supply", "receive", "return-to-vendor"].includes(
    action
  )
  const reasonRequired = action === "return-to-vendor"
  const confirmationRequired = [
    "ready",
    "supply",
    "receive",
    "return-to-vendor",
    "deliver",
  ].includes(action)
  const schema = z.object({
    carrier: dispatch
      ? z.string().trim().min(1, "Enter the carrier.").max(100)
      : z.string(),
    tracking: dispatch
      ? z.string().trim().min(1, "Enter the tracking reference.").max(200)
      : z.string(),
    recipient: staffDelivery
      ? z.string().trim().min(1, "Enter the recipient.").max(120)
      : z.string(),
    proof: staffDelivery
      ? z
          .string()
          .trim()
          .min(1, "Enter the delivery evidence reference.")
          .max(500)
      : z.string(),
    reference: referenceRequired
      ? z
          .string()
          .trim()
          .min(1, "Enter the physical handover reference.")
          .max(200)
      : z.string(),
    reason: reasonRequired
      ? z.string().trim().min(1, "Explain the return.").max(1000)
      : z.string(),
    confirmed: confirmationRequired
      ? z.literal(true, {
          error: "Confirm the physical check before continuing.",
        })
      : z.boolean(),
  })
  type Values = z.infer<typeof schema>
  async function submit(values: Values) {
    if (running.current || conflict) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      currentSession(expectedSession)
      const payload = selection.itemId
        ? {
            orderId,
            itemId: selection.itemId,
            version: selection.version,
            action: action as SupplyAction,
            ...(referenceRequired ? { reference: values.reference } : {}),
            ...(reasonRequired ? { reason: values.reason } : {}),
          }
        : {
            orderId,
            version: selection.version,
            action: action as FulfilmentAction,
            ...(dispatch
              ? { carrier: values.carrier, tracking: values.tracking }
              : {}),
            ...(staffDelivery
              ? { recipient: values.recipient, proof: values.proof }
              : {}),
          }
      // A saved uncertain request always wins, including its original token and revision.
      const body = pending ?? prepareOrderAction(scope, payload)
      setPending(body)
      const result = selection.itemId
        ? audience === "vendor"
          ? await postSupplyAction(
              body as Parameters<typeof postSupplyAction>[0],
              "vendor"
            )
          : await postSupplyAction(
              body as Parameters<typeof postSupplyAction>[0],
              "operations"
            )
        : audience === "customer"
          ? await postFulfilmentAction(
              body as Parameters<typeof postFulfilmentAction>[0],
              "customer"
            )
          : await postFulfilmentAction(
              body as Parameters<typeof postFulfilmentAction>[0],
              "operations"
            )
      currentSession(expectedSession)
      clearOrderAction(scope)
      onSuccess(result)
      toast.success("Order updated.")
      onClose()
    } catch (cause) {
      if (syncSession().sessionId !== expectedSession.sessionId) {
        setError(
          "Your account changed. Sign back in to review this action under the original account."
        )
      } else {
        if (
          cause instanceof GettyApiError &&
          [400, 401, 403, 404, 409, 422].includes(cause.status)
        ) {
          clearOrderAction(scope)
          setPending(null)
        }
        if (cause instanceof GettyApiError && cause.status === 409) {
          setConflict(true)
          void onRefresh()
        }
        if (cause instanceof GettyApiError && cause.status === 404)
          void onRefresh()
        setError(
          cause instanceof Error
            ? cause.message
            : "The result is uncertain. Retry the saved request."
        )
      }
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
      <DialogContent className="max-h-[min(90vh,46rem)] overflow-y-auto sm:max-w-lg">
        <DialogTitle>
          {audience === "customer"
            ? "Confirm receipt of my order"
            : labels[action]}
        </DialogTitle>
        <DialogDescription>
          {audience === "customer"
            ? "Confirm only when you have received the entire remaining order. If anything is missing, contact Getty support instead."
            : selection.itemName
              ? `${selection.itemName} · full item quantity. Record the physical custody change. Buying and delivery remain separate.`
              : action === "ready"
                ? "Check that every non-cancelled item has physically arrived at Getty and packing is complete."
                : "This changes the whole order delivery stage."}
        </DialogDescription>
        <ValidatedForm
          schema={schema}
          defaultValues={{
            carrier: String(pending?.carrier ?? ""),
            tracking: String(pending?.tracking ?? ""),
            recipient: String(pending?.recipient ?? ""),
            proof: String(pending?.proof ?? ""),
            reference: String(pending?.reference ?? ""),
            reason: String(pending?.reason ?? ""),
            confirmed: Boolean(pending),
          }}
          onSubmit={submit}
          className="space-y-4"
        >
          <fieldset
            disabled={busy || conflict || Boolean(pending)}
            className="space-y-4"
          >
            {dispatch && (
              <>
                <FormInputField
                  name="carrier"
                  id="fulfilment-carrier"
                  label="Carrier"
                />
                <FormInputField
                  name="tracking"
                  id="fulfilment-tracking"
                  label="Tracking reference"
                />
              </>
            )}
            {staffDelivery && (
              <>
                <FormInputField
                  name="recipient"
                  id="fulfilment-recipient"
                  label="Recipient"
                />
                <FormInputField
                  name="proof"
                  id="fulfilment-proof"
                  label="Delivery evidence reference"
                />
              </>
            )}
            {referenceRequired && (
              <FormInputField
                name="reference"
                id="supply-reference"
                label="Physical handover reference"
              />
            )}
            {reasonRequired && (
              <div>
                <label
                  htmlFor="supply-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Reason
                </label>
                <FormTextarea name="reason" id="supply-reason" />
              </div>
            )}
            {confirmationRequired && (
              <label className="flex items-start gap-3 text-sm leading-6">
                <FormInput
                  type="checkbox"
                  name="confirmed"
                  className="mt-1 size-4"
                />
                <span>
                  {audience === "customer"
                    ? "I received the entire remaining order."
                    : "I have checked the physical goods and confirm this action."}
                </span>
              </label>
            )}
          </fieldset>
          {pending && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              An earlier request may have reached the server. Retry sends its
              exact saved token and values.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
              {conflict
                ? " Review the refreshed order before trying again."
                : ""}
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
                onClick={() => void onRefresh().then(onClose)}
              >
                Review latest order
              </Button>
            ) : (
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Updating…"
                  : pending
                    ? "Retry saved request"
                    : audience === "customer"
                      ? "Confirm receipt"
                      : labels[action]}
              </Button>
            )}
          </DialogFooter>
        </ValidatedForm>
      </DialogContent>
    </Dialog>
  )
}
