import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none px-5 py-2.5';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-surface border border-border text-foreground hover:bg-surface-muted',
  ghost: 'text-foreground/70 hover:bg-surface-muted hover:text-foreground',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
};

export function ButtonLink({
  variant = 'primary',
  className = '',
  href,
  ...props
}: ButtonLinkProps) {
  return <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
