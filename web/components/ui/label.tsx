import { cn } from '@/lib/cn';
import { LabelHTMLAttributes, forwardRef } from 'react';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-sm font-medium text-ink', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
