"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const links = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Contact Us", href: "/contact" },
]

export default function DesktopNavigation() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-1 xl:gap-2"
    >
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "font-inter inline-flex min-h-12 items-center rounded-xl px-3 text-base font-semibold whitespace-nowrap transition",
              isActive
                ? "text-primary bg-[#f0f6f1]"
                : "hover:text-primary text-[#535862] hover:bg-[#f4f8f3]"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
