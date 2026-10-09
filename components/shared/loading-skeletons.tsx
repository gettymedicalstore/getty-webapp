import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function AuthFormSkeleton() {
  return (
    <LoadingRegion label="Loading account page">
      <div className="space-y-6">
        <Skeleton className="h-3 w-32" />
        <HeadingSkeleton />
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-13 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-13 w-full rounded-lg" />
        <Skeleton className="mx-auto h-4 w-48 max-w-full" />
      </div>
    </LoadingRegion>
  )
}

export function LoadingRegion({
  children,
  label = "Loading content",
  className,
}: {
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}
export function HeadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-[85%]" />
    </div>
  )
}
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading products">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border bg-white p-3 sm:p-4"
          >
            <Skeleton className="aspect-[4/3] rounded-xl" />
            <div className="space-y-3 pt-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-5 h-6 w-24" />
              <Skeleton className="mt-5 h-11 w-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <LoadingRegion label="Loading records" className="min-w-0">
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between gap-4 border-b p-5">
          <Skeleton className="h-10 w-72 max-w-[75%]" />
          <Skeleton className="size-10" />
        </div>
        <div className="grid grid-cols-3 gap-5 border-b bg-[#f8faf9] px-5 py-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              key={i}
              className={cn("h-3 w-16", i === 3 && "hidden sm:block")}
            />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="grid grid-cols-3 items-center gap-5 px-5 py-5 sm:grid-cols-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="hidden size-10 shrink-0 sm:block" />
                <div className="w-full space-y-2">
                  <Skeleton className="h-3 w-full max-w-32" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              </div>
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="hidden h-3 w-20 sm:block" />
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </LoadingRegion>
  )
}
export function MetricSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-10 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-8 w-28" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}
export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading dashboard">
      <div className="space-y-7">
        <HeadingSkeleton />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <TableSkeleton />
          <div className="rounded-2xl border bg-white p-6">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="mt-7 flex gap-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="w-full space-y-3">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  )
}
export function FormSkeleton() {
  return (
    <LoadingRegion label="Loading account details" className="max-w-3xl">
      <HeadingSkeleton />
      <div className="mt-7 rounded-2xl border bg-white p-6 sm:p-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-11 w-40" />
      </div>
    </LoadingRegion>
  )
}
export function CartSkeleton() {
  return (
    <LoadingRegion
      label="Loading your cart"
      className="site-container py-10 sm:py-14"
    >
      <HeadingSkeleton />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-5 rounded-2xl border bg-white p-5">
              <Skeleton className="size-20 shrink-0 sm:size-28" />
              <div className="min-w-0 flex-1 space-y-3 py-1">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-5 h-9 w-28" />
              </div>
              <Skeleton className="hidden h-5 w-20 sm:block" />
            </div>
          ))}
        </div>
        <div className="space-y-6 rounded-2xl border bg-white p-6">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </LoadingRegion>
  )
}
export function ProductDetailSkeleton() {
  return (
    <LoadingRegion
      label="Loading product details"
      className="site-container py-10 sm:py-14"
    >
      <Skeleton className="mb-8 h-4 w-64 max-w-full" />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <Skeleton className="aspect-square rounded-3xl" />
          <div className="mt-4 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-6 py-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-10 w-3/5" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </LoadingRegion>
  )
}
export function OrdersSkeleton() {
  return (
    <LoadingRegion label="Loading your orders">
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-6">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-6 flex gap-4">
              <Skeleton className="size-20" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <Skeleton className="mt-6 h-10 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}
