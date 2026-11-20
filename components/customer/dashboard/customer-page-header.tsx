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
    <div className="flex flex-col justify-end gap-5 sm:flex-row sm:items-center">
      {action && (
        <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
          {action}
        </div>
      )}
    </div>
  )
}
