"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check } from "lucide-react"

export default function PurchaseProgress() {
  const pathname = usePathname()
  const current = pathname === "/cart" ? 0 : pathname === "/checkout" ? 1 : 2
  return (
    <nav aria-label="Checkout progress" className="border-b bg-white">
      <ol className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-5">
        {["Shopping bag", "Checkout", "Payment"].map((label, index) => (
          <li
            key={label}
            aria-current={current === index ? "step" : undefined}
            className={`flex items-center gap-2 text-xs sm:text-sm ${index === current ? "font-semibold text-[#21472e]" : "text-[#64716b]"}`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs ${index <= current ? "bg-[#20553c] text-white" : "border border-[#dde5d9] bg-[#f6f8f3]"}`}
            >
              {index < current ? <Check className="size-3.5" /> : index + 1}
            </span>
            {index === 0 && current === 1 ? (
              <Link
                href="/cart"
                className="inline-flex min-h-11 items-center hover:underline"
              >
                {label}
              </Link>
            ) : (
              <span>{label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
