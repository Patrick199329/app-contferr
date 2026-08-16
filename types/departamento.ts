export type ColunaTipo = 'texto' | 'lista_opcoes' | 'data' | 'status' | 'responsavel';

export type Departamento = {
  id: string;
  nome: string;
  ordem: number;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
};

export type Coluna = {
  id: string;
  departamento_id: string;
  nome: string;
  tipo: ColunaTipo;
  ordem: number;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
};

export type OpcaoColuna = {
  id: string;
  coluna_id: string;
  valor: string;
  ordem: number;
  status: 'ativo' | 'inativo';
  created_at: string;
};

export const COLUNA_TIPO_LABELS: Record<ColunaTipo, string> = {
  texto: 'Texto livre',
  lista_opcoes: 'Lista de opções',
  data: 'Data',
  status: 'Status',
  responsavel: 'Responsável',
};

export const COLUNA_TIPOS_COM_OPCOES: ColunaTipo[] = ['lista_opcoes', 'status'];
