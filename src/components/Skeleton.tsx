export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border/60 ${className}`} />;
}

export function StatCardSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="text-sm text-muted">{label}</div>
      <Skeleton className="h-7 w-32 mt-2" />
      <Skeleton className="h-3 w-20 mt-2" />
    </div>
  );
}

export function PortfolioCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: Math.max(count, 1) }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-6 w-28 mt-3" />
          <Skeleton className="h-4 w-20 mt-2" />
        </div>
      ))}
    </div>
  );
}
