export type AuditOperacao = 'insert' | 'update' | 'delete' | 'login' | 'logout';

export type AuditLog = {
  id: string;
  tabela: string;
  operacao: AuditOperacao;
  registro_id: string | null;
  usuario_id: string | null;
  dados_antigos: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
};

export const AUDIT_OPERACAO_LABELS: Record<AuditOperacao, string> = {
  insert: 'Criação',
  update: 'Edição',
  delete: 'Exclusão',
  login: 'Entrada',
  logout: 'Saída',
};

export const AUDIT_OPERACAO_TONES: Record<AuditOperacao, 'active' | 'pending' | 'inactive' | 'neutral'> = {
  insert: 'active',
  update: 'pending',
  delete: 'inactive',
  login: 'active',
  logout: 'neutral',
};

export const AUDIT_TABELA_LABELS: Record<string, string> = {
  profiles: 'Usuários',
  departamentos: 'Departamentos',
  permissoes: 'Permissões',
  cliente_departamentos: 'Vínculo cliente-departamento',
  sessao: 'Sessão (login/logout)',
};
