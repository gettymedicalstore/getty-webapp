import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function AuthFormHeading({
  title,
  description,
  eyebrow,
}: {
  title: string
  description: string
  eyebrow?: string
}) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-4 text-[11px] font-semibold tracking-[.14em] text-[#65766b] uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[30px] leading-[1.16] font-semibold tracking-[-.045em] text-[#1e2d25] sm:text-[36px]">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#68726c]">{description}</p>
    </div>
  )
}

export function AuthProgress({
  steps,
  current,
  label,
}: {
  steps: string[]
  current: number
  label: string
}) {
  return (
    <ol aria-label={label} className="mb-9 flex gap-3">
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={index === current ? "step" : undefined}
          className="min-w-0 flex-1"
        >
          <div
            aria-hidden
            className={cn(
              "mb-3 h-0.5 rounded-full",
              index <= current ? "bg-[#168250]" : "bg-[#e9edea]"
            )}
          />
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs",
              index === current
                ? "font-semibold text-[#216345]"
                : "text-[#68746b]"
            )}
          >
            {index < current ? (
              <Check aria-hidden className="size-3.5 shrink-0" />
            ) : (
              <span>{index + 1}.</span>
            )}
            {step}
          </span>
        </li>
      ))}
    </ol>
  )
}
