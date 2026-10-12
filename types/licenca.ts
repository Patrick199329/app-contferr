export type LicencaSituacao = 'ativa' | 'em_renovacao' | 'cancelada';
export type LicencaRecorrencia = 'anual' | 'manual' | 'sem_renovacao';

export const LICENCA_SITUACAO_LABELS: Record<LicencaSituacao, string> = {
  ativa: 'Ativa',
  em_renovacao: 'Em renovação',
  cancelada: 'Cancelada',
};

export const LICENCA_RECORRENCIA_LABELS: Record<LicencaRecorrencia, string> = {
  anual: 'Recorrência anual',
  manual: 'Controle manual',
  sem_renovacao: 'Sem renovação',
};

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export type Licenca = {
  id: string;
  departamento_id: string;
  cliente_id: string;
  tipo: string;
  orgao_emissor: string | null;
  numero: string | null;
  municipio: string | null;
  uf: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  situacao: LicencaSituacao;
  responsavel_id: string | null;
  recorrencia: LicencaRecorrencia;
  taxa_mes: number | null;
  taxa_dia: number | null;
  valor_estimado: number | null;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

// Situação exibida na lista: cruza a situação cadastrada com a data de
// vencimento — vencida/a vencer são derivadas, não gravadas.
export type LicencaVigencia =
  | 'cancelada'
  | 'em_renovacao'
  | 'sem_vencimento'
  | 'vencida'
  | 'a_vencer'
  | 'vigente';

export const LICENCA_VIGENCIA_LABELS: Record<LicencaVigencia, string> = {
  cancelada: 'Cancelada',
  em_renovacao: 'Em renovação',
  sem_vencimento: 'Sem vencimento informado',
  vencida: 'Vencida',
  a_vencer: 'A vencer',
  vigente: 'Vigente',
};

export const LICENCA_VIGENCIA_TONES: Record<
  LicencaVigencia,
  'pending' | 'active' | 'inactive' | 'neutral'
> = {
  vigente: 'active',
  a_vencer: 'pending',
  vencida: 'inactive',
  em_renovacao: 'pending',
  sem_vencimento: 'neutral',
  cancelada: 'neutral',
};

export const DIAS_A_VENCER = 60;

export function calcularVigencia(
  licenca: Pick<Licenca, 'situacao' | 'data_vencimento'>,
  hoje: string = new Date().toISOString().slice(0, 10),
): LicencaVigencia {
  if (licenca.situacao === 'cancelada') return 'cancelada';
  if (licenca.situacao === 'em_renovacao') return 'em_renovacao';
  if (!licenca.data_vencimento) return 'sem_vencimento';
  if (licenca.data_vencimento < hoje) return 'vencida';
  const limite = new Date(`${hoje}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + DIAS_A_VENCER);
  return licenca.data_vencimento <= limite.toISOString().slice(0, 10) ? 'a_vencer' : 'vigente';
}
