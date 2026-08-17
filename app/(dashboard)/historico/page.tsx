import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCompetencia, formatCompetencia, shiftCompetencia } from '@/lib/competencia';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import type { Coluna, Departamento } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';

type HistoricoPageProps = {
  searchParams: Promise<{ departamento?: string; competencia?: string }>;
};

function resolveDisplayValue(
  tipo: Coluna['tipo'],
  valor: string | null | undefined,
  profiles: { id: string; email: string; nome: string }[],
): string {
  if (!valor) return '—';
  if (tipo === 'responsavel') {
    const p = profiles.find((p) => p.id === valor);
    return p ? p.nome || p.email : valor;
  }
  if (tipo === 'data') {
    const [ano, mes, dia] = valor.split('-');
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
  }
  return valor;
}

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
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Histórico de Competências</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {(todosDepartamentos ?? []).length === 0
            ? 'Nenhum departamento cadastrado ainda.'
            : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
        </p>
      </main>
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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Histórico — {formatCompetencia(competencia)}</h1>
        <div className="flex gap-2">
          {departamentos.map((dep) => (
            <Link
              key={dep.id}
              href={`/historico?departamento=${dep.id}&competencia=${competencia}`}
              className={`rounded px-3 py-1 text-sm ${
                dep.id === departamentoAtual.id
                  ? 'bg-foreground text-background'
                  : 'border border-black/15 dark:border-white/20'
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
          className="underline"
        >
          ← Mês anterior
        </Link>
        {podeAvancar ? (
          <Link
            href={`/historico?departamento=${departamentoAtual.id}&competencia=${shiftCompetencia(competencia, 1)}`}
            className="underline"
          >
            Mês seguinte →
          </Link>
        ) : null}
        <Link href="/tarefas" className="ml-auto underline">
          Ver tabela do mês corrente
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/10">
              <th className="p-2">Cliente</th>
              {(colunas ?? []).map((coluna) => (
                <th key={coluna.id} className="p-2">
                  {coluna.nome}
                  {coluna.status === 'inativo' ? ' (inativa)' : ''}
                </th>
              ))}
              <th className="p-2">Última edição</th>
            </tr>
          </thead>
          <tbody>
            {clientesOrdenados.map((cliente) => {
              const tarefa = tarefasPorCliente[cliente.id];
              return (
                <tr key={cliente.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="p-2 font-medium whitespace-nowrap">
                    {cliente.nome_fantasia}
                    {cliente.status === 'inativo' ? ' (inativo)' : ''}
                  </td>
                  {(colunas ?? []).map((coluna) => (
                    <td key={coluna.id} className="p-2 text-black/80 dark:text-white/80">
                      {resolveDisplayValue(
                        coluna.tipo,
                        tarefa?.valores?.[coluna.id],
                        profiles ?? [],
                      )}
                    </td>
                  ))}
                  <td className="p-2 text-xs whitespace-nowrap text-black/50 dark:text-white/50">
                    {tarefa?.updated_at ? new Date(tarefa.updated_at).toLocaleString('pt-BR') : '—'}
                  </td>
                </tr>
              );
            })}
            {clientesOrdenados.length === 0 ? (
              <tr>
                <td
                  colSpan={(colunas ?? []).length + 2}
                  className="p-4 text-center text-black/50 dark:text-white/50"
                >
                  Nenhum dado registrado para esta competência.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
