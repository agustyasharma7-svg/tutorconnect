import { cn } from '@/lib/cn';
import { HTMLAttributes } from 'react';

const tones = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-brand-soft bg-brand-soft/40 text-ink',
} as const;

export function Alert({
  className,
  tone = 'error',
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof tones }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-control border px-3 py-2 text-sm',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
