export default function ProductsPageSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-lg border border-black/5 bg-white"
        >
          <div className="aspect-square animate-pulse bg-black/5" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-black/10" />
            <div className="h-4 w-full animate-pulse rounded bg-black/10" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-black/10" />
            <div className="h-10 animate-pulse rounded bg-black/10" />
          </div>
        </div>
      ))}
    </div>
  )
}
