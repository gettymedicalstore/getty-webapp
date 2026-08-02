type OrderSummaryCardProps = {
  subtotal: number
  delivery: number
  discount?: number
  total: number
  currency?: string
}

export default function OrderSummaryCard({
  subtotal,
  delivery,
  discount = 0,
  total,
  currency = "NGN",
}: OrderSummaryCardProps) {
  const format = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <aside className="bg-background rounded-xl border p-5">
      <h2 className="font-semibold">Order summary</h2>

      <div className="mt-5 space-y-3 text-sm">
        <SummaryRow label="Subtotal" value={format(subtotal)} />
        <SummaryRow label="Delivery" value={format(delivery)} />

        {discount > 0 && (
          <SummaryRow label="Discount" value={`-${format(discount)}`} />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">{format(total)}</span>
      </div>
    </aside>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
