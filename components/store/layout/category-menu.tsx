"use client"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadingRegion } from "@/components/shared/loading-skeletons"
import { Menu, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { categoriesQueryOptions } from "@/features/categories/api/category-query-options"
export default function CategoryMenu() {
  const [open, setOpen] = useState(false),
    ref = useRef<HTMLDivElement>(null),
    query = useQuery(categoriesQueryOptions())
  useEffect(() => {
    const outside = (e: PointerEvent) => {
        if (!ref.current?.contains(e.target as Node)) setOpen(false)
      },
      escape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false)
      }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [])
  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <Button
        type="button"
        aria-expanded={open}
        aria-controls="category-navigation"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 min-w-52 items-center justify-between gap-3 rounded-xl border-[#d4e3d7] bg-[#edf5ef] px-4 text-base font-semibold text-[#24523a] shadow-none hover:border-[#b5cfbc] hover:bg-[#e2efe6] aria-expanded:bg-[#e2efe6]"
      >
        <Menu className="size-5" />
        All categories
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>
      {open && (
        <nav
          id="category-navigation"
          aria-label="Product categories"
          className="absolute top-full left-0 z-50 max-h-[65dvh] w-80 overflow-y-auto rounded-2xl border border-[#e1e8d9] bg-white p-2 shadow-[0_16px_40px_-20px_rgba(24,54,15,.25)]"
        >
          {query.isPending && (
            <LoadingRegion label="Loading categories" className="space-y-3 p-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </LoadingRegion>
          )}
          {(query.data ?? []).map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              onClick={() => setOpen(false)}
              className="hover:text-primary flex min-h-12 items-center rounded-lg px-4 py-3 text-sm font-medium text-[#425d4c] hover:bg-[#f2f6eb]"
            >
              {category.name}
            </Link>
          ))}
          <Link
            href="/categories"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-12 items-center rounded-xl bg-[#edf5ef] px-4 py-3 text-sm font-semibold text-[#24523a]"
          >
            View all categories
          </Link>
        </nav>
      )}
    </div>
  )
}
