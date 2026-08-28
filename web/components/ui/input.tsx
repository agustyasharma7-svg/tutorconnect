import { cn } from '@/lib/cn';
import { InputHTMLAttributes, forwardRef } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink',
        'placeholder:text-ink-muted/60',
        'transition focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25',
        'disabled:cursor-not-allowed disabled:bg-cream-dark/40 disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
