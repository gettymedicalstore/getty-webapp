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
    <nav className="flex h-12 items-center gap-7">
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
              "font-inter text-[14px] leading-4 font-semibold transition",
              isActive ? "text-primary" : "hover:text-primary text-[#535862]"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
