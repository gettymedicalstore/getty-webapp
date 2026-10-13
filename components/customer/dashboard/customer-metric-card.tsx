import { Skeleton } from "@/components/ui/skeleton"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type CustomerMetricCardProps = {
  loading?: boolean
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  compact?: boolean
  valueClassName?: string
}

export default function CustomerMetricCard({
  title,
  value,
  description,
  loading = false,
  icon: Icon,
  compact = false,
  valueClassName,
}: CustomerMetricCardProps) {
  return (
    <article
      className={cn(
        "min-w-0 rounded-2xl border border-[#e3e9dd] bg-white shadow-[0_2px_4px_-3px_rgba(34,58,29,.1)]",
        compact ? "p-3 sm:p-5" : "p-6"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#5e6f63]">{title}</p>

        <div
          className={cn(
            "grid shrink-0 place-items-center rounded-xl bg-[#f1f6eb] text-[#789063]",
            compact ? "size-7 sm:size-8" : "size-10"
          )}
        >
          <Icon aria-hidden className={compact ? "size-4" : "size-5"} />
        </div>
      </div>
      <div
        className={cn(
          "font-semibold tracking-[-.04em] break-words text-[#2e492f] tabular-nums",
          compact ? "mt-2 text-2xl" : "mt-4 text-[28px]",
          valueClassName
        )}
      >
        {loading ? (
          <>
            <span className="sr-only">Loading</span>
            <Skeleton className="h-9 w-28 max-w-full" />
          </>
        ) : (
          value
        )}
      </div>

      {description && (
        <p
          className={cn(
            "text-muted-foreground text-xs leading-5",
            compact ? "mt-2" : "mt-4"
          )}
        >
          {description}
        </p>
      )}
    </article>
  )
}
