"use client"

import { Menu } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { mockCategories } from "@/features/categories/data/mock-categories"

export default function CategoryMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="font-inter flex h-11.75 min-w-44 cursor-pointer items-center justify-between gap-4 rounded-[6px] border-[#E9EAEB] bg-[#FDFDFD] px-6 py-4 text-[14px] leading-[110%] font-medium tracking-normal text-[#252B37] shadow-none hover:bg-white"
      >
        <Menu />
        All Categories
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 w-72 overflow-hidden rounded-b-lg border border-black/5 bg-white shadow-2xl">
          {mockCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="hover:bg-primary/5 hover:text-primary block border-b border-black/5 px-5 py-3.5 text-sm font-medium transition last:border-none"
            >
              {category.name}
            </Link>
          ))}

          <Link
            href="/categories"
            className="text-primary block bg-[#f7f7f7] px-5 py-3.5 text-sm font-bold"
          >
            View all categories
          </Link>
        </div>
      )}
    </div>
  )
}
