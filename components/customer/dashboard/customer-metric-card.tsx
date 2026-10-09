import { Skeleton } from "@/components/ui/skeleton"
import type { LucideIcon } from "lucide-react"

type CustomerMetricCardProps = {
  loading?: boolean
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
}

export default function CustomerMetricCard({
  title,
  value,
  description,
  loading = false,
  icon: Icon,
}: CustomerMetricCardProps) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#e3e9dd] bg-white p-6 shadow-[0_2px_4px_-3px_rgba(34,58,29,.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#5e6f63]">{title}</p>

          <p className="mt-4 text-[28px] font-semibold tracking-[-.04em] break-words text-[#2e492f]">
            {loading ? (
              <>
                <span className="sr-only">Loading</span>
                <Skeleton className="h-9 w-28" />
              </>
            ) : (
              value
            )}
          </p>
        </div>

        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f6eb] text-[#789063]">
          <Icon className="size-5" />
        </div>
      </div>

      {description && (
        <p className="text-muted-foreground mt-4 text-xs">{description}</p>
      )}
    </article>
  )
}
