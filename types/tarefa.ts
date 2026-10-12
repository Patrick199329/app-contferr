export type Tarefa = {
  id: string;
  cliente_id: string;
  departamento_id: string;
  competencia: string;
  valores: Record<string, string | null>;
  responsavel_padrao_id: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};
