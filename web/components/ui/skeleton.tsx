import { cn } from '@/lib/cn';
import { HTMLAttributes } from 'react';

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-control', className)}
      {...props}
    />
  );
}

/** Content placeholder while page data loads (shell already visible). */
export function PageSkeleton({
  className,
  cards = 3,
}: {
  className?: string;
  cards?: number;
}) {
  return (
    <div
      className={cn('mx-auto max-w-3xl space-y-4 px-4 py-10', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-48 sm:w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-panel" />
        ))}
      </div>
    </div>
  );
}

/** Full chrome placeholder while auth role is resolved. */
export function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-cream" role="status" aria-busy="true" aria-label="Loading">
      <div className="sticky top-0 z-40 border-b border-cream-dark bg-cream/90 px-4 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 self-start overflow-hidden border-r border-cream-dark bg-ink p-4 lg:block">
          <Skeleton className="mb-6 h-4 w-20 bg-white/10" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/10" />
            ))}
          </div>
          <Skeleton className="mb-4 mt-8 h-4 w-16 bg-white/10" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/10" />
            ))}
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
