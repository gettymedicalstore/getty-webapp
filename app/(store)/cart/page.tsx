import type { Metadata } from "next"

import CartPageContent from "@/features/cart/components/store/cart-page-content"

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "Review the medical products in your shopping cart.",
}

export default function CartPage() {
  return <CartPageContent />
}
