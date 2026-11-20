"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
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
  FormCheckbox,
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
  postOperationsActionWithPhotoRetry,
  postFulfilmentAction,
  postSupplyAction,
  type FulfilmentAction,
  type OperationsOrder,
  type SupplyAction,
} from "../api/fulfilment"
import type { ManagedOrder } from "../api/order-management"
import { uploadParcelPhoto } from "../api/parcel-photo"

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
  const [parcelPhoto, setParcelPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoPreviewUrl = useRef<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [photoStage, setPhotoStage] = useState<
    "uploading" | "verifying" | null
  >(null)
  const [conflict, setConflict] = useState(false)
  const running = useRef(false)
  useEffect(
    () => () => {
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current)
    },
    []
  )

  function selectParcelPhoto(file: File | null) {
    if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current)
    const preview = file ? URL.createObjectURL(file) : null
    photoPreviewUrl.current = preview
    setPhotoPreview(preview)
    setParcelPhoto(file)
  }

  const action = selection.action
  const dispatch = action === "dispatch"
  const staffDelivery = action === "deliver" && audience === "operations"
  const photoAllowed =
    audience === "operations" && (action === "ready" || action === "dispatch")
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
          error:
            action === "ready"
              ? "Confirm the status update before continuing."
              : "Confirm the physical check before continuing.",
        })
      : z.boolean(),
  })
  type Values = z.infer<typeof schema>
  async function submit(values: Values) {
    if (running.current || conflict) return
    running.current = true
    setBusy(true)
    setError("")
    const photoStep: {
      current: "requesting" | "uploading" | "verifying" | "attaching" | null
    } = { current: null }
    try {
      currentSession(expectedSession)
      let parcelPhotoFileId: string | undefined
      if (!pending && photoAllowed && parcelPhoto) {
        photoStep.current = "requesting"
        parcelPhotoFileId = await uploadParcelPhoto(
          orderId,
          parcelPhoto,
          (stage) => {
            photoStep.current = stage
            setPhotoStage(stage)
          }
        )
        photoStep.current = null
      }
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
            ...(parcelPhotoFileId ? { parcelPhotoFileId } : {}),
          }
      // A saved uncertain request always wins, including its original token and revision.
      const body = pending ?? prepareOrderAction(scope, payload)
      setPending(body)
      if ("parcelPhotoFileId" in body && body.parcelPhotoFileId)
        photoStep.current = "attaching"
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
          : await postOperationsActionWithPhotoRetry(
              body as Parameters<typeof postFulfilmentAction>[0],
              () => currentSession(expectedSession)
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
        const message =
          cause instanceof Error
            ? cause.message
            : "The result is uncertain. Retry the saved request."
        setError(
          photoStep.current === "attaching" &&
            cause instanceof GettyApiError &&
            cause.status === 404 &&
            /parcel photo/i.test(message)
            ? `Getty could not attach the verified parcel photo to this order: ${message} Refresh the order, then try the photo again or remove it to continue without one.`
            : photoStep.current === "attaching"
              ? `Order update failed after photo verification: ${message}`
              : photoStep.current === "verifying"
                ? `Parcel photo verification failed: ${message}`
                : photoStep.current === "uploading" ||
                    photoStep.current === "requesting"
                  ? `Parcel photo upload failed: ${message}`
                  : message
        )
      }
    } finally {
      running.current = false
      setBusy(false)
      setPhotoStage(null)
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
                ? "Move the order to Ready for delivery after every active item has been received. A parcel photo is optional."
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
            {photoAllowed && (
              <div className="space-y-2">
                <label
                  htmlFor="fulfilment-parcel-photo"
                  className="block text-sm font-medium"
                >
                  Packed parcel photo (optional)
                </label>
                <input
                  ref={photoInput}
                  id="fulfilment-parcel-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) =>
                    selectParcelPhoto(event.currentTarget.files?.[0] ?? null)
                  }
                  className="file:bg-primary file:text-primary-foreground w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2"
                />
                {photoPreview && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">Photo preview</p>
                    <Image
                      src={photoPreview}
                      alt="Selected packed parcel photo preview"
                      width={480}
                      height={320}
                      unoptimized
                      className="bg-muted max-h-56 w-full rounded-md object-contain"
                    />
                  </div>
                )}
                <p className="text-muted-foreground text-xs">
                  Use a photo of the packed parcel without readable recipient
                  labels.
                </p>
                {parcelPhoto && !busy && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      selectParcelPhoto(null)
                      if (photoInput.current) photoInput.current.value = ""
                    }}
                  >
                    Remove photo
                  </Button>
                )}
                {photoStage && (
                  <p role="status" className="text-primary text-sm">
                    {photoStage === "uploading"
                      ? "Uploading parcel photo…"
                      : "Verifying parcel photo…"}
                  </p>
                )}
              </div>
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
              <label
                htmlFor="fulfilment-action-confirmed"
                className="flex cursor-pointer items-start gap-3 text-sm leading-6"
              >
                <FormCheckbox
                  id="fulfilment-action-confirmed"
                  name="confirmed"
                  className="mt-0.5 size-5 rounded-md"
                  disabled={busy || conflict || Boolean(pending)}
                />
                <span>
                  {audience === "customer"
                    ? "I received the entire remaining order."
                    : action === "ready"
                      ? "I confirm this delivery status update."
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
