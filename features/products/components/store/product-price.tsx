import { cn } from "@/lib/utils"
import { productMoney, productPricing } from "../../utils/product-pricing"

export default function ProductPrice({
  price,
  compareAtPrice,
  currency = "NGN",
  large = false,
}: {
  price: number
  compareAtPrice?: number
  currency?: string
  large?: boolean
}) {
  const pricing = productPricing(price, compareAtPrice)
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          className={cn(
            "font-semibold tracking-tight [overflow-wrap:anywhere] break-words text-[#173d2b]",
            large ? "text-3xl sm:text-4xl" : "text-xl"
          )}
        >
          <span className="sr-only">Price: </span>
          {productMoney(price, currency)}
        </span>
        {pricing.originalPrice !== null && (
          <del
            className={cn("text-[#5e6f63]", large ? "text-base" : "text-xs")}
          >
            <span className="sr-only">Original price: </span>
            {productMoney(pricing.originalPrice, currency)}
          </del>
        )}
      </div>
      {pricing.saving > 0 && (
        <p className="mt-1.5 text-xs font-medium text-[#157047]">
          Save {productMoney(pricing.saving, currency)}
        </p>
      )}
    </div>
  )
}
