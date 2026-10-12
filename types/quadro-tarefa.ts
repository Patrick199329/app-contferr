import type { ColunaTipo } from './departamento';

export type QuadroTarefaStatus = 'a_fazer' | 'em_andamento' | 'concluida';
export type RecorrenciaFrequencia = 'diaria' | 'semanal' | 'mensal';

export type QuadroTarefa = {
  id: string;
  numero: number;
  departamento_id: string;
  cliente_id: string | null;
  titulo: string;
  descricao: string | null;
  responsavel_id: string | null;
  criado_por: string;
  prazo: string | null;
  status: QuadroTarefaStatus;
  concluida_em: string | null;
  recorrencia_id: string | null;
  valores: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type QuadroTarefaCampo = {
  id: string;
  departamento_id: string;
  nome: string;
  tipo: ColunaTipo;
  ordem: number;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
};

export type QuadroTarefaCampoOpcao = {
  id: string;
  campo_id: string;
  valor: string;
  ordem: number;
  status: 'ativo' | 'inativo';
  created_at: string;
};

export type QuadroTarefaRecorrencia = {
  id: string;
  departamento_id: string;
  cliente_id: string | null;
  titulo: string;
  descricao: string | null;
  responsavel_id: string | null;
  criado_por: string;
  frequencia: RecorrenciaFrequencia;
  intervalo: number;
  proxima_data: string;
  data_fim: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};

export type QuadroTarefaRecorrenciaLog = {
  id: string;
  executado_em: string;
  status: 'sucesso' | 'erro';
  tarefas_criadas: number | null;
  mensagem: string | null;
  executado_por: string | null;
};

export const QUADRO_TAREFA_STATUS_LABELS: Record<QuadroTarefaStatus, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export const RECORRENCIA_FREQUENCIA_LABELS: Record<RecorrenciaFrequencia, string> = {
  diaria: 'dia(s)',
  semanal: 'semana(s)',
  mensal: 'mês(es)',
};
