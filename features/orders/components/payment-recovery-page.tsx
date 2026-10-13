"use client"
import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import { syncSession } from "@/features/auth/api/session-store"
import { currentSession } from "@/features/auth/api/refresh-session"
import { RotateCcw, Wallet } from "lucide-react"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import PageHeading from "@/components/shared/page-heading"
import ContentError from "@/components/shared/content-error"
import EmptyState from "@/components/shared/empty-state"
import { OrdersSkeleton } from "@/components/shared/loading-skeletons"
import StatusBadge from "@/components/admin/shared/status-badge"
import {
  getRecoveryPayments,
  reconcilePayment,
  retryRefund,
  defaultOrderFilters,
  type RecoveryPayment,
} from "../api/order-management"
import { prepareOrderAction, clearOrderAction } from "../api/action-recovery"
import { formatOrderAmount } from "../utils/format-order-amount"
import { OrderFilters } from "./orders-page"
export default function PaymentRecoveryPage() {
  const { data: session } = useAuthSession()
  const [filters, setFilters] = useState(defaultOrderFilters),
    [selected, setSelected] = useState<{
      payment: RecoveryPayment
      action: "reconcile" | "retry"
    } | null>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const running = useRef(false)
  const [expectedSession] = useState(syncSession)
  const query = useQuery({
    queryKey: ["payment-recovery", session?.user?.id, filters],
    queryFn: () => getRecoveryPayments(filters),
    enabled: session?.user?.role === "admin",
  })
  async function confirm() {
    if (!selected || !session?.user || running.current) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      currentSession(expectedSession)
      if (selected.action === "reconcile")
        await reconcilePayment(selected.payment.id)
      else {
        const fresh = await getRecoveryPayments(filters)
        currentSession(expectedSession)
        const latest = fresh.find(
          (payment) => payment.id === selected.payment.id
        )
        if (!latest || latest.kind !== "refund" || latest.status !== "failed")
          throw new Error(
            "This refund is no longer confirmed failed. Refresh the queue before taking another action."
          )
        const scope = `${expectedSession.user!.id}:refund:${selected.payment.id}`
        const { token } = prepareOrderAction(scope, {
          payment: selected.payment.id,
        })
        currentSession(expectedSession)
        await retryRefund(latest, token)
        currentSession(expectedSession)
        clearOrderAction(scope)
      }
      currentSession(expectedSession)
      toast.success(
        "Request accepted for processing. Refresh to check its outcome."
      )
      setSelected(null)
      await query.refetch()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The recovery request could not be confirmed."
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  return (
    <div className="min-w-0 space-y-6">
      <Link
        href="/admin/orders"
        className="text-primary inline-flex min-h-11 items-center text-sm font-medium"
      >
        ← Back to orders
      </Link>
      <PageHeading
        title="Payment recovery"
        description="Review failed or uncertain payments. Provider verification determines the final payment status."
        action={
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RotateCcw aria-hidden className="size-4" />
            Refresh
          </Button>
        }
      />
      <OrderFilters value={filters} onChange={setFilters} datesOnly />
      {query.isPending ? (
        <OrdersSkeleton />
      ) : query.isError ? (
        <ContentError
          title="We couldn’t load payment recovery"
          description={query.error.message}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No payments need recovery"
          description="Failed or uncertain attempts for the selected dates will appear here."
          icon={Wallet}
        />
      ) : (
        <div className="space-y-4">
          {query.data.map((payment) => (
            <article
              key={payment.id}
              className="rounded-xl border bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold capitalize">
                    {payment.kind} ·{" "}
                    {formatOrderAmount(payment.amount, payment.currency)}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs break-all">
                    Payment {payment.id}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs break-all">
                    Order {payment.purchase}
                  </p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
              {payment.failure && (
                <p className="mt-4 text-sm">{payment.failure}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected({ payment, action: "reconcile" })
                    setError("")
                  }}
                >
                  Verify with provider
                </Button>
                {payment.kind === "refund" && payment.status === "failed" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected({ payment, action: "retry" })
                      setError("")
                    }}
                  >
                    Retry failed refund
                  </Button>
                )}
              </div>
            </article>
          ))}
          <p className="text-muted-foreground text-sm">
            Showing up to 100 attempts. Narrow the dates if needed.
          </p>
        </div>
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogTitle>
            {selected?.action === "retry"
              ? "Retry failed refund?"
              : "Verify payment?"}
          </DialogTitle>
          <DialogDescription>
            {selected?.action === "retry"
              ? "Submit a new attempt for this confirmed failed refund. The backend checks it has not already been refunded before processing."
              : "Ask the provider to verify this payment. This does not mark it as paid or repeat an uncertain refund."}
          </DialogDescription>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void confirm()}>
              {busy ? "Requesting…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
