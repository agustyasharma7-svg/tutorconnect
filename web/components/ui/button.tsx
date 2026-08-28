import { cn } from '@/lib/cn';
import Link from 'next/link';
import {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  forwardRef,
} from 'react';

const variants = {
  primary:
    'bg-brand text-white shadow-sm hover:bg-brand-hover focus-visible:ring-brand',
  secondary:
    'border border-line bg-surface text-ink hover:border-brand hover:text-brand focus-visible:ring-brand',
  ghost:
    'text-ink-muted hover:bg-cream-dark/60 hover:text-ink focus-visible:ring-brand',
  danger:
    'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger',
  link: 'text-brand underline-offset-2 hover:underline focus-visible:ring-brand px-0 py-0 h-auto',
} as const;

const sizes = {
  sm: 'h-8 rounded-full px-3 text-sm',
  md: 'h-10 rounded-full px-4 text-sm',
  lg: 'h-11 rounded-full px-5 text-base',
  icon: 'h-9 w-9 rounded-full p-0',
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

const base =
  'inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-50';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function ButtonLink({
  className,
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  );
}
