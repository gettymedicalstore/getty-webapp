import type { LucideIcon } from "lucide-react"

type MetricCardProps = {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: string
    positive: boolean
  }
}

export default function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: MetricCardProps) {
  return (
    <article className="bg-background rounded-xl border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>

        <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
          <Icon className="size-5" />
        </div>
      </div>

      {(description || trend) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={
                trend.positive
                  ? "font-semibold text-emerald-600"
                  : "text-destructive font-semibold"
              }
            >
              {trend.value}
            </span>
          )}

          {description && (
            <span className="text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </article>
  )
}
