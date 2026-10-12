export type ProcessoStatus = 'ativo' | 'concluido' | 'cancelado';
export type ProcessoPrioridade = 'baixa' | 'normal' | 'alta';
export type ProcessoEtapaStatus = 'pendente' | 'em_andamento' | 'concluida';
export type TaxaJucemgSituacao = 'a_gerar' | 'gerada' | 'paga' | 'dispensada';

export type TipoProcesso = {
  id: string;
  departamento_id: string;
  codigo: string;
  nome: string;
  cor: string;
  ordem: number;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
};

export type EtapaModelo = {
  id: string;
  tipo_processo_id: string;
  nome: string;
  ordem: number;
  trava_por_taxa_jucemg: boolean;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
};

export type Processo = {
  id: string;
  departamento_id: string;
  tipo_processo_id: string;
  cliente_id: string | null;
  // Empresa ainda sem cadastro/CNPJ — ver types/processo.ts e a check
  // processos_cliente_xor na migration: exatamente um dos dois preenchido.
  cliente_nome_avulso: string | null;
  titulo: string;
  prioridade: ProcessoPrioridade;
  responsavel_id: string | null;
  criado_por: string;
  data_abertura: string;
  prazo_final: string | null;
  protocolo_geral: string | null;
  observacoes: string | null;
  status: ProcessoStatus;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessoEtapa = {
  id: string;
  processo_id: string;
  etapa_modelo_id: string | null;
  nome: string;
  ordem: number;
  trava_por_taxa_jucemg: boolean;
  status: ProcessoEtapaStatus;
  prazo: string | null;
  responsavel_id: string | null;
  protocolo: string | null;
  observacoes: string | null;
  concluida_em: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessoTaxaJucemg = {
  id: string;
  processo_etapa_id: string;
  situacao: TaxaJucemgSituacao;
  numero_guia: string | null;
  valor: number | null;
  vencimento: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessoEvento = {
  id: string;
  processo_id: string;
  descricao: string;
  criado_por: string | null;
  created_at: string;
};

export const PROCESSO_STATUS_LABELS: Record<ProcessoStatus, string> = {
  ativo: 'Ativo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const PROCESSO_PRIORIDADE_LABELS: Record<ProcessoPrioridade, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
};

export const PROCESSO_ETAPA_STATUS_LABELS: Record<ProcessoEtapaStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export const TAXA_JUCEMG_SITUACAO_LABELS: Record<TaxaJucemgSituacao, string> = {
  a_gerar: 'A gerar',
  gerada: 'Gerada',
  paga: 'Paga',
  dispensada: 'Dispensada',
};
