import { cn } from "@/lib/utils"

type OrderStatusBadgeProps = {
  status: string
  className?: string
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
}

export default function OrderStatusBadge({
  status,
  className,
}: OrderStatusBadgeProps) {
  const key = status.toLowerCase()

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        statusStyles[key] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {status}
    </span>
  )
}
