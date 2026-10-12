import type { Coluna } from '@/types/departamento';

// Regra de exibição, não de dados: uma coluna não-mensal só aparece nos
// meses marcados manualmente pelo admin no cadastro dela.
export function colunaAplicavelNoMes(
  coluna: Pick<Coluna, 'periodicidade' | 'meses_aplicaveis'>,
  competencia: string,
): boolean {
  if (coluna.periodicidade === 'mensal') return true;
  const mes = Number(competencia.split('-')[1]);
  return coluna.meses_aplicaveis.includes(mes);
}
