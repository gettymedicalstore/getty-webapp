import type { ReactNode } from "react"

type DashboardSectionProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export default function DashboardSection({
  title,
  description,
  action,
  children,
}: DashboardSectionProps) {
  return (
    <section className="bg-background rounded-xl border">
      <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold">{title}</h2>

          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>

        {action}
      </div>

      <div className="p-5">{children}</div>
    </section>
  )
}
