"use client"
import { CircleAlert, ArrowUpRight, RotateCcw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
export default function ContentError({
  title = "We couldn’t load this just yet",
  description = "Please try again in a moment. If the problem continues, our team can help.",
  onRetry,
  retrying = false,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-72 flex-col items-center justify-center rounded-xl border border-[#e3e8e5] bg-white px-5 py-9 text-center shadow-[0_2px_4px_rgba(25,45,32,.02)] sm:px-8 sm:py-12",
        className
      )}
    >
      <span className="mb-5 grid size-12 place-items-center rounded-full border border-[#e7ebe8] bg-[#f8faf8] text-[#7e8d83] ring-6 ring-[#fafbf9]">
        <CircleAlert aria-hidden className="size-5" strokeWidth={1.5} />
      </span>
      <h2 className="text-base font-semibold tracking-tight text-[#2f3b33] sm:text-lg">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#69756d]">
        {description}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={retrying}
            aria-busy={retrying}
            className="h-11 gap-2 rounded-lg border-[#d9e1dc] bg-white px-4 text-[13px] text-[#394b3d]"
          >
            <RotateCcw
              aria-hidden
              className={cn("size-3.5", retrying && "animate-spin")}
            />
            {retrying ? "Trying again…" : "Try again"}
          </Button>
        )}
        <Link
          href="/contact"
          className="hover:text-primary inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#5f7564] hover:underline"
        >
          Get support
          <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
