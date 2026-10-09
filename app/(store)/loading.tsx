import {
  HeadingSkeleton,
  ProductGridSkeleton,
} from "@/components/shared/loading-skeletons"
export default function Loading() {
  return (
    <div className="site-container space-y-8 py-12">
      <HeadingSkeleton />
      <ProductGridSkeleton />
    </div>
  )
}
