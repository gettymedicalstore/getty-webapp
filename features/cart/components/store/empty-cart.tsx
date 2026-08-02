import { ArrowRight, ShoppingCart } from "lucide-react"
import Link from "next/link"

export default function EmptyCart() {
  return (
    <div className="rounded-xl bg-white px-6 py-16 text-center">
      <div className="bg-primary/10 text-primary mx-auto grid size-16 place-items-center rounded-full">
        <ShoppingCart className="size-7" />
      </div>

      <h1 className="mt-5 text-2xl font-bold">Your cart is empty</h1>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
        Browse our medical products and add the items you need to your cart.
      </p>

      <Link
        href="/products"
        className="bg-primary mt-6 inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-bold text-white"
      >
        Browse products
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
