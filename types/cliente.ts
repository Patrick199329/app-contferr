export type Cliente = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
};
