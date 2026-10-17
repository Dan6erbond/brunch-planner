import { Skeleton } from '#/components/ui/skeleton'

export function BrunchesPending() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-9 w-72 max-w-full" />
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-24" />
      ))}
    </div>
  )
}

export function BrunchDetailPending() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-80 max-w-full" />
      <Skeleton className="h-40" />
    </div>
  )
}
