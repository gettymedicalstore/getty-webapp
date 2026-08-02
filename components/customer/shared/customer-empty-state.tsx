import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type CustomerEmptyStateProps = {
  title: string
  description: string
  icon: LucideIcon
  action?: ReactNode
}

export default function CustomerEmptyState({
  title,
  description,
  icon: Icon,
  action,
}: CustomerEmptyStateProps) {
  return (
    <div className="bg-background flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="bg-muted grid size-12 place-items-center rounded-full">
        <Icon className="text-muted-foreground size-5" />
      </div>

      <h3 className="mt-4 font-semibold">{title}</h3>

      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
