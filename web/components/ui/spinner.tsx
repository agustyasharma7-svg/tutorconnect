import { cn } from '@/lib/cn';

export function Spinner({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2 p-8 text-sm text-ink-muted', className)}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
