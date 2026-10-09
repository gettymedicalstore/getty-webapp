import type { Product } from "../../types/product"
import ProductCard from "./product-card"

export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-6 text-center">
        <div>
          <h2 className="text-base font-semibold text-[#252B37]">
            No products found
          </h2>

          <p className="mt-2 text-sm text-[#667085]">
            Try changing your filters or search terms.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
