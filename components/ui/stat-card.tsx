import type { LucideIcon } from 'lucide-react';
import { Card, type CardTint } from './card';

type StatTint = Exclude<CardTint, 'plain'>;

const ICON_COLOR: Record<StatTint, string> = {
  peach: 'text-tint-peach-icon',
  lavender: 'text-tint-lavender-icon',
  mint: 'text-tint-mint-icon',
};

export function StatCard({
  tint,
  icon: Icon,
  label,
  value,
  hint,
}: {
  tint: StatTint;
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card tint={tint} className="flex flex-col gap-4">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 ${ICON_COLOR[tint]}`}
      >
        <Icon size={20} strokeWidth={2} />
      </span>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-foreground/70">{label}</p>
      </div>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
