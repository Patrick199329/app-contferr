import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { currentCompetencia, formatCompetencia, shiftCompetencia } from '@/lib/competencia';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { resolveDisplayValue } from '@/lib/valores-tarefa';
import type { Cliente } from '@/types/cliente';
import type { Coluna, Departamento } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';

type HistoricoPageProps = {
  searchParams: Promise<{ departamento?: string; competencia?: string }>;
};

export default async function HistoricoPage({ searchParams }: HistoricoPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem')
    .returns<Departamento[]>();

  const permitidos = await getDepartamentosPermitidos();
  const departamentos = (todosDepartamentos ?? []).filter((d) =>
    podeAcessarDepartamento(permitidos, d.id),
  );

  if (departamentos.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Histórico de Competências</h1>
        <p className="text-sm text-muted">
          {(todosDepartamentos ?? []).length === 0
            ? 'Nenhum departamento cadastrado ainda.'
            : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam, competencia: competenciaParam } = await searchParams;
  const departamentoAtual =
    departamentos.find((d) => d.id === departamentoParam) ?? departamentos[0];
  const competencia = competenciaParam ?? shiftCompetencia(currentCompetencia(), -1);
  const podeAvancar = competencia < currentCompetencia();

  const { data: tarefas } = await supabase
    .from('tarefas')
    .select('*')
    .eq('departamento_id', departamentoAtual.id)
    .eq('competencia', competencia)
    .returns<Tarefa[]>();

  const clienteIds = [...new Set((tarefas ?? []).map((t) => t.cliente_id))];

  const [{ data: clientes }, { data: colunas }, { data: profiles }] = await Promise.all([
    clienteIds.length > 0
      ? supabase.from('clientes').select('*').in('id', clienteIds).returns<Cliente[]>()
      : Promise.resolve({ data: [] as Cliente[] }),
    supabase
      .from('colunas')
      .select('*')
      .eq('departamento_id', departamentoAtual.id)
      .order('ordem')
      .returns<Coluna[]>(),
    supabase.from('profiles').select('id, email, nome'),
  ]);

  const clientesOrdenados = [...(clientes ?? [])].sort((a, b) =>
    a.nome_fantasia.localeCompare(b.nome_fantasia),
  );

  const tarefasPorCliente: Record<string, Tarefa> = {};
  for (const tarefa of tarefas ?? []) {
    tarefasPorCliente[tarefa.cliente_id] = tarefa;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Histórico — {formatCompetencia(competencia)}</h1>
        <div className="flex flex-wrap gap-2">
          {departamentos.map((dep) => (
            <Link
              key={dep.id}
              href={`/historico?departamento=${dep.id}&competencia=${competencia}`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                dep.id === departamentoAtual.id
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-surface-muted text-foreground/70 hover:bg-surface-muted/70'
              }`}
            >
              {dep.nome}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <Link
          href={`/historico?departamento=${departamentoAtual.id}&competencia=${shiftCompetencia(competencia, -1)}`}
          className="text-muted hover:underline"
        >
          ← Mês anterior
        </Link>
        {podeAvancar ? (
          <Link
            href={`/historico?departamento=${departamentoAtual.id}&competencia=${shiftCompetencia(competencia, 1)}`}
            className="text-muted hover:underline"
          >
            Mês seguinte →
          </Link>
        ) : null}
        <Link href="/tarefas" className="ml-auto text-muted hover:underline">
          Ver tabela do mês corrente
        </Link>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="app-table w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th>Cliente</th>
              {(colunas ?? []).map((coluna) => (
                <th key={coluna.id}>
                  {coluna.nome}
                  {coluna.status === 'inativo' ? <Badge tone="neutral"> inativa</Badge> : null}
                </th>
              ))}
              <th>Última edição</th>
            </tr>
          </thead>
          <tbody>
            {clientesOrdenados.map((cliente) => {
              const tarefa = tarefasPorCliente[cliente.id];
              return (
                <tr key={cliente.id}>
                  <td className="font-medium whitespace-nowrap">
                    {cliente.nome_fantasia}
                    {cliente.status === 'inativo' ? <Badge tone="inactive"> inativo</Badge> : null}
                  </td>
                  {(colunas ?? []).map((coluna) => (
                    <td key={coluna.id} className="text-foreground/80">
                      {resolveDisplayValue(
                        coluna.tipo,
                        tarefa?.valores?.[coluna.id],
                        profiles ?? [],
                      )}
                    </td>
                  ))}
                  <td className="text-xs whitespace-nowrap text-muted">
                    {tarefa?.updated_at ? new Date(tarefa.updated_at).toLocaleString('pt-BR') : '—'}
                  </td>
                </tr>
              );
            })}
            {clientesOrdenados.length === 0 ? (
              <tr>
                <td colSpan={(colunas ?? []).length + 2} className="p-4 text-center text-muted">
                  Nenhum dado registrado para esta competência.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
