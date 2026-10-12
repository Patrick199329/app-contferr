import type { Coluna } from '@/types/departamento';

// "Tem pendência" — definição única, reaproveitada por todo indicador da
// Tabela de Tarefas (cabeçalho, Dashboard pessoal, por departamento e a
// bolinha por linha em components/tarefas-table.tsx):
// - Departamento com pelo menos uma coluna ativa tipo checklist: pendência é
//   ter alguma dessas colunas diferente de "feito"/"nao_se_aplica" (vazio ou
//   "pendente" conta).
// - Sem nenhuma coluna checklist: cai numa heurística mais fraca — pendência
//   é ter alguma coluna ativa (qualquer tipo) sem valor gravado.
// - Sem nenhuma linha em `tarefas` ainda pra esse mês (cliente novo, virada
//   não rodou) conta como pendência — nada foi feito ainda.
//
// Fica num arquivo próprio, sem nenhum import de servidor (ao contrário de
// lib/indicadores.ts, que usa @/lib/supabase/server e portanto não pode ser
// importado por um Client Component como components/tarefas-table.tsx).
export function temPendencia(
  colunasDoDepartamento: Pick<Coluna, 'id' | 'tipo'>[],
  valores: Record<string, string | null> | undefined,
): boolean {
  const checklist = colunasDoDepartamento.filter((c) => c.tipo === 'checklist');
  const relevantes = checklist.length > 0 ? checklist : colunasDoDepartamento;
  if (relevantes.length === 0) return false;

  if (checklist.length > 0) {
    return checklist.some((c) => {
      const v = valores?.[c.id];
      return v !== 'feito' && v !== 'nao_se_aplica';
    });
  }
  return relevantes.some((c) => !valores?.[c.id]);
}
