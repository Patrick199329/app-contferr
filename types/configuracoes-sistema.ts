export type ConfiguracoesSistema = {
  id: true;
  tarefas_meses_edicao_retroativa: number;
  updated_by: string | null;
  updated_at: string;
};

export const CONFIGURACOES_SISTEMA_PADRAO: ConfiguracoesSistema = {
  id: true,
  tarefas_meses_edicao_retroativa: 0,
  updated_by: null,
  updated_at: new Date(0).toISOString(),
};
