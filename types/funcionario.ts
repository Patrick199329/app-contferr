export type Funcionario = {
  id: string;
  cliente_id: string;
  nome: string;
  cpf: string | null;
  status: 'ativo' | 'inativo';
  ordem: number;
  created_at: string;
  updated_at: string;
};
