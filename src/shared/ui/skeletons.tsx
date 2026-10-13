/**
 * Skeleton loaders for async UI states.
 */

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-lg bg-primary/10 ${className}`}
  />
)

export const CategorySkeleton = () => <Skeleton className="h-11 w-full" />

export const DifficultySkeleton = () => (
  <div className="flex gap-2">
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-10 flex-1" />
    ))}
  </div>
)
