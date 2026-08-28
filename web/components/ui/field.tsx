import { cn } from '@/lib/cn';
import { ReactNode } from 'react';
import { Label } from './label';

/** Labeled control with wired `htmlFor` / `id` for accessibility. */
export function FormField({
  label,
  id,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  id: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
