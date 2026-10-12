export type Cliente = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  codigo: string | null;
  inscricao_estadual: string | null;
  tipo_calculo_ir: string | null;
  telefone: string | null;
  cep: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  // Pasta do cliente no Google Drive — link fixo, usado como atalho em toda
  // tela que referencia esse cliente.
  google_drive_url: string | null;
  status: 'ativo' | 'inativo';
  // Credenciais de acesso a portais do governo (ex.: gov.br, eSocial
  // doméstico) — do empregador, não de cada funcionário: a mesma credencial
  // vale pra qualquer atividade feita em nome desse cliente, independente
  // de quantos funcionários ele tenha.
  senha_gov: string | null;
  codigo_acesso: string | null;
  senha: string | null;
  created_at: string;
  updated_at: string;
};

// Campos do cliente que uma coluna "campo_cliente" pode puxar — os 11
// cadastrais já têm leitura aberta a qualquer authenticated na própria
// tabela `clientes`, então liberados pra qualquer departamento. As 3
// credenciais (senha_gov/codigo_acesso/senha) só podem ser usadas em
// departamentos com "Funcionários por cliente" ligado — mesma regra de
// acesso que já vale pra aba "Acesso a portais" do cadastro, reforçada por
// trigger no banco (verificar_campo_cliente_alvo_restrito), não só na tela.
export type CampoCliente =
  | 'codigo'
  | 'cnpj'
  | 'inscricao_estadual'
  | 'tipo_calculo_ir'
  | 'telefone'
  | 'cep'
  | 'endereco'
  | 'complemento'
  | 'bairro'
  | 'cidade'
  | 'uf'
  | 'senha_gov'
  | 'codigo_acesso'
  | 'senha';

export const CAMPO_CLIENTE_LABELS: Record<CampoCliente, string> = {
  codigo: 'Código Alterdata',
  cnpj: 'CNPJ/CPF',
  inscricao_estadual: 'Inscrição estadual',
  tipo_calculo_ir: 'Tipo de cálculo IR',
  telefone: 'Telefone',
  cep: 'CEP',
  endereco: 'Endereço',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  uf: 'UF',
  senha_gov: 'Senha gov.br',
  codigo_acesso: 'Código de acesso',
  senha: 'Senha',
};

// Só selecionáveis em departamentos com "Funcionários por cliente" ligado, e
// mascarados por padrão na exibição (Tabela de Tarefas/Histórico).
export const CAMPOS_CLIENTE_RESTRITOS: CampoCliente[] = ['senha_gov', 'codigo_acesso', 'senha'];
