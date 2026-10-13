import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  status: string
  className?: string
  label?: string
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-amber-100 text-amber-800",
  expired: "bg-zinc-100 text-zinc-700",
  closed: "bg-zinc-100 text-zinc-700",
  enabled: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  inactive: "bg-zinc-100 text-zinc-700",
  disabled: "bg-zinc-100 text-zinc-700",
  cancelled: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
}

export default function StatusBadge({
  status,
  className,
  label,
}: StatusBadgeProps) {
  const key = status.toLowerCase()

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        statusStyles[key] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {label ?? status}
    </span>
  )
}
