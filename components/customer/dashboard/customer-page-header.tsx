import type { ReactNode } from "react"

type CustomerPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export default function CustomerPageHeader({
  description,
  action,
}: CustomerPageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      {description && (
        <p className="max-w-xl min-w-0 text-[13px] leading-6 text-[#68736b]">
          {description}
        </p>
      )}

      {action && (
        <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
          {action}
        </div>
      )}
    </div>
  )
}
