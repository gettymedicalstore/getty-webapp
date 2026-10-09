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
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-.04em] text-[#24312a] sm:text-[30px]">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#68736b]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
          {action}
        </div>
      )}
    </div>
  )
}
