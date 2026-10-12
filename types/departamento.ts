import type { LinkIconeKey } from '@/lib/link-icones';
import type { CampoCliente } from './cliente';

export type ColunaTipo =
  | 'texto'
  | 'lista_opcoes'
  | 'data'
  | 'status'
  | 'responsavel'
  | 'checklist'
  | 'campo_funcionario'
  | 'campo_cliente'
  | 'link';
export type ColunaPeriodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual';

// Os três estados fixos do tipo de coluna "checklist" — sem opções
// configuráveis, ao contrário de lista_opcoes/status.
export type ChecklistEstado = 'pendente' | 'feito' | 'nao_se_aplica';
export const CHECKLIST_ESTADOS: ChecklistEstado[] = ['pendente', 'feito', 'nao_se_aplica'];
export const CHECKLIST_ESTADO_LABELS: Record<ChecklistEstado, string> = {
  pendente: 'Pendente',
  feito: 'Feito',
  nao_se_aplica: 'Não se aplica',
};

export type Departamento = {
  id: string;
  nome: string;
  ordem: number;
  status: 'ativo' | 'inativo';
  parent_id: string | null;
  usa_tarefas_padrao: boolean;
  usa_quadro_tarefas: boolean;
  usa_funcionarios: boolean;
  usa_processos: boolean;
  usa_alvaras: boolean;
  usa_parcelamentos: boolean;
  usa_corresponsavel: boolean;
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
  periodicidade: ColunaPeriodicidade;
  meses_aplicaveis: number[];
  // Legado do módulo "Campo do funcionário" (revertido) — algumas colunas
  // antigas, hoje sempre inativas, ainda têm esse valor gravado. Não é mais
  // possível criar coluna desse tipo.
  campo_funcionario_alvo: string | null;
  // Só preenchido quando tipo === 'campo_cliente' — qual campo do cadastro
  // do cliente essa coluna mostra, sempre lido ao vivo (nunca gravado em
  // tarefas.valores). Ver types/cliente.ts.
  campo_cliente_alvo: CampoCliente | null;
  // Só preenchidos quando tipo === 'link' — URL fixa e ícone, configurados
  // uma vez na coluna (não varia por cliente/mês). Nas telas de uso só
  // aparece o ícone, clicável, abrindo link_url.
  link_icone: LinkIconeKey;
  link_url: string | null;
  // Quando true, a virada mensal copia o valor do mês anterior pra dentro do
  // mês novo (igual já acontece com o Responsável) — pra colunas cujo valor
  // tende a não mudar todo mês (ex.: forma de envio). Não muda o comportamento
  // já existente do checklist "não se aplica" (que já herda automaticamente).
  manter_valor_anterior: boolean;
  // Só válido pra colunas tipo 'responsavel' de departamentos com
  // usa_corresponsavel — marca a coluna como a da pessoa corresponsável.
  eh_corresponsavel: boolean;
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
  checklist: 'Checklist (Pendente/Feito/Não se aplica)',
  campo_funcionario: 'Campo do funcionário (descontinuado)',
  campo_cliente: 'Campo do cliente (só leitura, puxa do cadastro)',
  link: 'Link',
};

export const COLUNA_TIPOS_COM_OPCOES: ColunaTipo[] = ['lista_opcoes', 'status'];

// "Manter valor do mês anterior" só faz sentido pra dado cadastral que tende
// a se repetir. Fora dessa lista: Checklist (já tem sua própria herança, só
// do "não se aplica" — herdar o valor todo faria uma tarefa nascer "Feito"
// sem ninguém ter feito nada esse mês) e Campo do funcionário (sempre lido ao
// vivo do cadastro). Mesma restrição aplicada em coluna-form.tsx,
// departamentos/actions.ts e na função executar_virada_mensal no banco.
export const TIPOS_COM_MANTER_VALOR_ANTERIOR: ColunaTipo[] = [
  'texto',
  'lista_opcoes',
  'status',
  'responsavel',
];

export const COLUNA_PERIODICIDADE_LABELS: Record<ColunaPeriodicidade, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};
