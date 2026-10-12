import type { Departamento } from '@/types/departamento';

// Mantém um departamento se a ferramenta estiver habilitada nele, ou se ele
// for pai de algum filho que tenha — o pai nunca é selecionável sozinho (é só
// o agrupador do dropdown), então o flag dele não decide nada por si só.
export function filtrarPorFerramenta(
  todosDepartamentos: Departamento[],
  ferramenta: 'usa_tarefas_padrao' | 'usa_quadro_tarefas' | 'usa_processos' | 'usa_alvaras' | 'usa_parcelamentos',
): Departamento[] {
  const habilitadosIds = new Set(
    todosDepartamentos.filter((d) => d[ferramenta]).map((d) => d.id),
  );
  return todosDepartamentos.filter((d) => {
    if (habilitadosIds.has(d.id)) return true;
    return todosDepartamentos.some((c) => c.parent_id === d.id && habilitadosIds.has(c.id));
  });
}

// Remove os departamentos que só agrupam subdepartamentos (não têm
// colunas/tarefas próprias) — mesmo filtro repetido em app/(dashboard)/tarefas
// /page.tsx, quadro-tarefas/page.tsx e historico/page.tsx, agora reaproveitado
// por lib/indicadores.ts também.
export function getDepartamentosSelecionaveis(departamentos: Departamento[]): Departamento[] {
  const paisComFilhos = new Set(
    departamentos.filter((d) => d.parent_id).map((d) => d.parent_id as string),
  );
  return departamentos.filter((d) => !paisComFilhos.has(d.id));
}
