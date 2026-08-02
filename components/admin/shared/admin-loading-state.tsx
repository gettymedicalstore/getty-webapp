export default function AdminLoadingState() {
  return (
    <div className="space-y-6">
      <div className="bg-muted h-9 w-56 animate-pulse rounded-md" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted/60 h-32 animate-pulse rounded-xl border"
          />
        ))}
      </div>

      <div className="bg-muted/60 h-96 animate-pulse rounded-xl border" />
    </div>
  )
}
