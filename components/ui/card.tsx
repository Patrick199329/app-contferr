import type { ReactNode } from 'react';

export type CardTint = 'peach' | 'lavender' | 'mint' | 'plain';

const TINTS: Record<CardTint, string> = {
  peach: 'bg-tint-peach-bg',
  lavender: 'bg-tint-lavender-bg',
  mint: 'bg-tint-mint-bg',
  plain: 'bg-surface',
};

export function Card({
  tint = 'plain',
  className = '',
  children,
}: {
  tint?: CardTint;
  className?: string;
  children: ReactNode;
}) {
  const surface =
    tint === 'plain'
      ? 'app-card'
      : `border border-white/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_-10px_rgba(0,0,0,0.12)] ${TINTS[tint]}`;

  return <div className={`rounded-3xl p-6 ${surface} ${className}`}>{children}</div>;
}
