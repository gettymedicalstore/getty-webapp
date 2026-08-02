import type { LucideIcon } from "lucide-react"

type CustomerMetricCardProps = {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
}

export default function CustomerMetricCard({
  title,
  value,
  description,
  icon: Icon,
}: CustomerMetricCardProps) {
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

      {description && (
        <p className="text-muted-foreground mt-4 text-xs">{description}</p>
      )}
    </article>
  )
}
