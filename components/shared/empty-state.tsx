import { PackageOpen, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
export default function EmptyState({
  title,
  description,
  action,
  icon: Icon = PackageOpen,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[#e3eadf] bg-[#fcfdfa] p-6 text-center sm:p-10">
      <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-[#e1e9d9] bg-[#f2f6eb]">
        <Icon className="size-6 text-[#8aa277]" />
      </span>
      <h2 className="text-lg font-semibold tracking-tight text-[#35502f]">
        {title}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
