import type { ReactNode } from "react"

type CustomerPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export default function CustomerPageHeader({
  title,
  description,
  action,
}: CustomerPageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
