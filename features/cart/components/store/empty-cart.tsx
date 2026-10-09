import { ArrowRight, ShoppingBag } from "lucide-react"
import Link from "next/link"
export default function EmptyCart() {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#dce7df] bg-white px-6 py-10 shadow-[0_12px_40px_-32px_rgba(13,67,43,0.45)] sm:px-12 sm:py-12">
      <div className="text-primary flex size-16 items-center justify-center rounded-2xl border border-[#d7e8dc] bg-[#eff7f0]">
        <ShoppingBag className="size-8" strokeWidth={1.6} aria-hidden />
      </div>
      <p className="mt-8 text-xs font-semibold tracking-[0.15em] text-[#55715f] uppercase">
        Shopping bag
      </p>
      <h1 className="font-geist mt-2 text-3xl font-semibold tracking-tight text-[#203629] sm:text-4xl">
        Your bag is empty
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[#617368]">
        Browse medical supplies and add the products you need. You can review
        your bag here before checking out.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/products"
          className="bg-primary hover:bg-primary-darker inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-6 text-sm font-semibold text-white transition-colors"
        >
          Browse products
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          href="/categories"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d4e3d7] px-6 text-sm font-semibold text-[#31573d] transition-colors hover:bg-[#f2f8f3]"
        >
          Shop by category
        </Link>
      </div>
    </div>
  )
}
