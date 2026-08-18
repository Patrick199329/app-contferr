import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatCnpj } from '@/lib/cnpj';
import { formatCompetencia } from '@/lib/competencia';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { resolveDisplayValue } from '@/lib/valores-tarefa';
import type { Cliente } from '@/types/cliente';
import type { Coluna } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';

type ClientePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ meses?: string }>;
};

const OPCOES_MESES = [3, 6, 12] as const;
const MESES_PADRAO = 6;

export default async function ClientePage({ params, searchParams }: ClientePageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { id } = await params;
  const { meses: mesesParam } = await searchParams;
  const mostrarTodos = mesesParam === 'todos';
  const meses = mostrarTodos ? null : Number(mesesParam) || MESES_PADRAO;

  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single<Cliente>();
  if (!cliente) {
    notFound();
  }

  const [{ data: vinculos }, { data: profiles }] = await Promise.all([
    supabase.from('cliente_departamentos').select('departamento_id').eq('cliente_id', id),
    supabase.from('profiles').select('id, email, nome'),
  ]);

  const permitidos = await getDepartamentosPermitidos();
  const departamentoIdsVinculados = (vinculos ?? [])
    .map((v) => v.departamento_id)
    .filter((depId) => podeAcessarDepartamento(permitidos, depId));

  const departamentosVisiveis: { id: string; nome: string }[] = [];
  if (departamentoIdsVinculados.length > 0) {
    const { data } = await supabase
      .from('departamentos')
      .select('id, nome')
      .in('id', departamentoIdsVinculados)
      .order('ordem');
    departamentosVisiveis.push(...(data ?? []));
  }

  async function buscarTarefasDoDepartamento(departamentoId: string) {
    const query = supabase
      .from('tarefas')
      .select('*')
      .eq('cliente_id', id)
      .eq('departamento_id', departamentoId)
      .order('competencia', { ascending: false });
    const { data } = await (meses !== null ? query.limit(meses) : query).returns<Tarefa[]>();
    return data ?? [];
  }

  const compilados = await Promise.all(
    departamentosVisiveis.map(async (dep) => {
      const [{ data: colunas }, tarefas] = await Promise.all([
        supabase
          .from('colunas')
          .select('*')
          .eq('departamento_id', dep.id)
          .order('status')
          .order('ordem')
          .returns<Coluna[]>(),
        buscarTarefasDoDepartamento(dep.id),
      ]);
      return { departamento: dep, colunas: colunas ?? [], tarefas };
    }),
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {cliente.nome_fantasia}
            {cliente.status === 'inativo' ? ' (inativo)' : ''}
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {cliente.razao_social} — {formatCnpj(cliente.cnpj)}
          </p>
        </div>
        {podeGerenciarClientes(profile) ? (
          <Link href={`/clientes/${id}/editar`} className="text-sm underline">
            Editar cadastro / departamentos
          </Link>
        ) : null}
      </div>

      {compilados.length > 0 ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-black/60 dark:text-white/60">Mostrar:</span>
          {OPCOES_MESES.map((n) => (
            <Link
              key={n}
              href={`/clientes/${id}?meses=${n}`}
              className={!mostrarTodos && meses === n ? 'font-medium underline' : 'underline'}
            >
              {n} meses
            </Link>
          ))}
          <Link
            href={`/clientes/${id}?meses=todos`}
            className={mostrarTodos ? 'font-medium underline' : 'underline'}
          >
            Todos
          </Link>
        </div>
      ) : null}

      {compilados.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Este cliente ainda não está vinculado a nenhum departamento que você tenha acesso.
        </p>
      ) : (
        compilados.map(({ departamento, colunas, tarefas }) => (
          <div key={departamento.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{departamento.nome}</h2>
            {colunas.length === 0 || tarefas.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-white/60">
                {colunas.length === 0
                  ? 'Departamento ainda sem colunas configuradas.'
                  : 'Nenhuma tarefa registrada ainda para este cliente neste departamento.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left dark:border-white/10">
                      <th className="p-2">Competência</th>
                      {colunas.map((coluna) => (
                        <th key={coluna.id} className="p-2">
                          {coluna.nome}
                          {coluna.status === 'inativo' ? ' (inativa)' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tarefas.map((tarefa) => (
                      <tr key={tarefa.id} className="border-b border-black/5 dark:border-white/5">
                        <td className="p-2 font-medium whitespace-nowrap">
                          {formatCompetencia(tarefa.competencia)}
                        </td>
                        {colunas.map((coluna) => (
                          <td key={coluna.id} className="p-2 text-black/80 dark:text-white/80">
                            {resolveDisplayValue(
                              coluna.tipo,
                              tarefa.valores?.[coluna.id],
                              profiles ?? [],
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </main>
  );
}
