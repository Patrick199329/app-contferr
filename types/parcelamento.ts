export type ParcelamentoSituacao = 'ativo' | 'quitado' | 'perdido' | 'cancelado';

export const PARCELAMENTO_SITUACAO_LABELS: Record<ParcelamentoSituacao, string> = {
  ativo: 'Ativo',
  quitado: 'Quitado',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
};

export const PARCELAMENTO_SITUACAO_TONES: Record<
  ParcelamentoSituacao,
  'pending' | 'active' | 'inactive' | 'neutral'
> = {
  ativo: 'active',
  quitado: 'neutral',
  perdido: 'inactive',
  cancelado: 'neutral',
};

export type Parcelamento = {
  id: string;
  departamento_id: string;
  cliente_id: string;
  origem: string;
  numero_parcelamento: string | null;
  data_inicio: string;
  quantidade_parcelas: number;
  parcela_inicial: number;
  meses_tolerancia_inadimplencia: number | null;
  situacao: ParcelamentoSituacao;
  responsavel_id: string | null;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type ParcelamentoParcela = {
  id: string;
  parcelamento_id: string;
  competencia: string;
  numero_parcela: number;
  guia_enviada: boolean;
  pago: boolean;
  data_envio: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type AvisoPerdaParcelamento = { mesesEmAberto: number; tolerancia: number };

// Meses mais recentes em aberto, um atrás do outro, até o limite da
// tolerância — mesma lógica que a virada usa pra decidir "perdido" (ver
// executar_virada_parcelamentos), mostrada com antecedência aqui, pra avisar
// antes de acontecer. null quando não há regra de tolerância configurada,
// quando o parcelamento não está mais ativo, ou quando não há mês em aberto.
export function calcularAvisoPerda(
  parcelamento: Pick<Parcelamento, 'situacao' | 'meses_tolerancia_inadimplencia'>,
  historico: Pick<ParcelamentoParcela, 'competencia' | 'pago'>[],
): AvisoPerdaParcelamento | null {
  const tolerancia = parcelamento.meses_tolerancia_inadimplencia;
  if (!tolerancia || parcelamento.situacao !== 'ativo') return null;

  const ordenado = [...historico].sort((a, b) => (a.competencia < b.competencia ? 1 : -1));
  let mesesEmAberto = 0;
  for (const p of ordenado) {
    if (p.pago) break;
    mesesEmAberto++;
  }
  mesesEmAberto = Math.min(mesesEmAberto, tolerancia);

  return mesesEmAberto > 0 ? { mesesEmAberto, tolerancia } : null;
}
