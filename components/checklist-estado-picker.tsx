'use client';

import { Check, Minus } from 'lucide-react';
import { CHECKLIST_ESTADO_LABELS, type ChecklistEstado } from '@/types/departamento';

type ChecklistEstadoPickerProps = {
  value: string;
  onSelect: (valor: ChecklistEstado) => void;
};

// Ciclo fixo: vazio/Pendente -> Feito -> Não se aplica -> Pendente -> ...
// Um botão só (não os três lado a lado) porque a mesma janela pode ter
// várias colunas desse tipo — três ícones por coluna vira poluição visual
// rápido.
const PROXIMO_ESTADO: Record<string, ChecklistEstado> = {
  '': 'feito',
  pendente: 'feito',
  feito: 'nao_se_aplica',
  nao_se_aplica: 'pendente',
};

export function ChecklistEstadoPicker({ value, onSelect }: ChecklistEstadoPickerProps) {
  const estadoAtual = (value || 'pendente') as ChecklistEstado;
  const label = CHECKLIST_ESTADO_LABELS[estadoAtual] ?? 'Pendente';

  const corAtiva =
    estadoAtual === 'feito'
      ? 'border-status-active bg-status-active text-white'
      : estadoAtual === 'nao_se_aplica'
        ? 'border-muted bg-muted text-white'
        : 'border-foreground/40 bg-surface-muted text-transparent hover:border-foreground/60';

  const dica =
    estadoAtual === 'nao_se_aplica'
      ? `${label} — repete nos próximos meses até você mudar. Clique para mudar`
      : `${label} — clique para mudar`;

  return (
    <button
      type="button"
      title={dica}
      aria-label={label}
      data-estado={estadoAtual}
      onClick={() => onSelect(PROXIMO_ESTADO[value] ?? 'feito')}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${corAtiva}`}
    >
      {estadoAtual === 'feito' ? <Check size={13} strokeWidth={3} /> : null}
      {estadoAtual === 'nao_se_aplica' ? <Minus size={13} strokeWidth={3} /> : null}
    </button>
  );
}
