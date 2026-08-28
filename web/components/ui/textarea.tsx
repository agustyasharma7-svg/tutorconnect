import { cn } from '@/lib/cn';
import { TextareaHTMLAttributes, forwardRef } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-muted/60',
        'transition focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25',
        'disabled:cursor-not-allowed disabled:bg-cream-dark/40 disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
