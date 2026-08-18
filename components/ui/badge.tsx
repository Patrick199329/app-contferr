import type { ReactNode } from 'react';

export type BadgeTone = 'pending' | 'active' | 'inactive' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  pending: 'bg-status-pending/10 text-status-pending',
  active: 'bg-status-active/10 text-status-active',
  inactive: 'bg-status-inactive/10 text-status-inactive',
  neutral: 'bg-surface-muted text-muted',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
