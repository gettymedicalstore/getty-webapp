import type { Metadata } from "next"

import WishlistPageContent from "@/features/wishlist/components/store/wishlist-page-content"

export const metadata: Metadata = {
  title: "Wishlist",
  description: "View products you have saved for later.",
}

export default function WishlistPage() {
  return <WishlistPageContent />
}
