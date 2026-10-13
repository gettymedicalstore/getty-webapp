type OrderSummaryCardProps = {
  subtotal?: number
  delivery?: number
  discount?: number
  tax?: number
  commission?: number
  total: number
  currency?: string
  vendor?: boolean
}

export default function OrderSummaryCard({
  subtotal,
  delivery,
  discount = 0,
  tax,
  commission,
  total,
  currency = "NGN",
  vendor = false,
}: OrderSummaryCardProps) {
  const format = (amount?: number) =>
    amount == null
      ? "—"
      : new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(amount)

  return (
    <section
      className="min-w-0 rounded-xl border bg-white p-5"
      aria-label="Order summary"
    >
      <h2 className="font-semibold">
        {vendor ? "Your items’ summary" : "Order summary"}
      </h2>

      <div className="mt-5 space-y-3 text-sm">
        <SummaryRow label="Subtotal" value={format(subtotal)} />
        <SummaryRow label="Delivery" value={format(delivery)} />

        {discount > 0 && (
          <SummaryRow label="Discount" value={`-${format(discount)}`} />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold tabular-nums">{format(total)}</span>
      </div>
      {tax != null && tax > 0 && (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Includes {format(tax)} in tax.
        </p>
      )}
      {vendor && commission != null && (
        <div className="mt-4 border-t pt-4 text-sm">
          <SummaryRow label="Commission" value={format(commission)} />
        </div>
      )}
      <p className="text-muted-foreground mt-3 text-xs leading-5">
        {vendor
          ? "Your items only. Original amounts before any refunds; not a payout balance."
          : "Original order total, before any refunds."}
      </p>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
