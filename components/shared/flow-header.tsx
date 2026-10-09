import Link from "next/link"
import { ArrowLeft, CircleHelp } from "lucide-react"
import AppLogo from "./app-logo"

export default function FlowHeader() {
  return (
    <header className="border-b border-[#e3eae3] bg-white">
      <div className="site-container flex min-h-20 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Getty Medical Store home"
          className="inline-flex shrink-0 items-center gap-2.5"
        >
          <AppLogo className="h-auto w-full max-w-[220px]" />
        </Link>
        <nav
          aria-label="Shopping and help"
          className="flex items-center gap-5 text-sm"
        >
          <Link
            href="/products"
            className="hover:text-primary inline-flex min-h-11 items-center gap-2 text-[#526951]"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back to shopping</span>
            <span className="sm:hidden">Shop</span>
          </Link>
          <Link
            href="/contact"
            className="hover:text-primary inline-flex min-h-11 items-center gap-2 text-[#526951]"
          >
            <CircleHelp className="size-4" />
            <span className="hidden sm:inline">Get help</span>
            <span className="sr-only sm:hidden">Get help</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
