import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export default function Newsletter() {
  return (
    <div className="rounded-xl border border-[#dce5d8] bg-white p-5">
      <h2 className="text-base font-semibold text-[#263f2a]">
        Need help choosing?
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5e6f63]">
        Get help with product information, your account or an existing order.
      </p>
      <Link
        href="/contact"
        className="text-primary mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:underline"
      >
        Contact our team <ArrowUpRight aria-hidden className="size-4" />
      </Link>
    </div>
  )
}
