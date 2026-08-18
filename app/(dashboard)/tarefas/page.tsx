import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TarefasTable } from '@/components/tarefas-table';
import { currentCompetencia, formatCompetencia } from '@/lib/competencia';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import type { Coluna, Departamento, OpcaoColuna } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';

type TarefasPageProps = {
  searchParams: Promise<{ departamento?: string }>;
};

export default async function TarefasPage({ searchParams }: TarefasPageProps) {
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
        <h1 className="text-xl font-semibold">Tabela de Tarefas</h1>
        <p className="text-sm text-muted">
          {(todosDepartamentos ?? []).length === 0
            ? 'Nenhum departamento cadastrado ainda.'
            : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
          {profile.role === 'admin' && (todosDepartamentos ?? []).length === 0 ? (
            <>
              {' '}
              <Link href="/departamentos/novo" className="underline">
                Criar o primeiro departamento
              </Link>
              .
            </>
          ) : null}
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam } = await searchParams;
  const departamentoAtual =
    departamentos.find((d) => d.id === departamentoParam) ?? departamentos[0];

  const competencia = currentCompetencia();

  const { data: vinculos } = await supabase
    .from('cliente_departamentos')
    .select('cliente_id')
    .eq('departamento_id', departamentoAtual.id);
  const clienteIdsDoDepartamento = (vinculos ?? []).map((v) => v.cliente_id);

  const [{ data: colunas }, { data: clientes }, { data: tarefas }, { data: profiles }] =
    await Promise.all([
      supabase
        .from('colunas')
        .select('*')
        .eq('departamento_id', departamentoAtual.id)
        .eq('status', 'ativo')
        .order('ordem')
        .returns<Coluna[]>(),
      clienteIdsDoDepartamento.length > 0
        ? supabase
            .from('clientes')
            .select('*')
            .in('id', clienteIdsDoDepartamento)
            .eq('status', 'ativo')
            .order('nome_fantasia')
            .returns<Cliente[]>()
        : Promise.resolve({ data: [] as Cliente[] }),
      supabase
        .from('tarefas')
        .select('*')
        .eq('departamento_id', departamentoAtual.id)
        .eq('competencia', competencia)
        .returns<Tarefa[]>(),
      supabase.from('profiles').select('id, email, nome').order('nome'),
    ]);

  const colunasComOpcoes = (colunas ?? []).filter(
    (c) => c.tipo === 'lista_opcoes' || c.tipo === 'status',
  );
  const opcoesPorColuna: Record<string, string[]> = {};
  if (colunasComOpcoes.length > 0) {
    const { data: opcoes } = await supabase
      .from('opcoes_coluna')
      .select('*')
      .in(
        'coluna_id',
        colunasComOpcoes.map((c) => c.id),
      )
      .eq('status', 'ativo')
      .order('ordem')
      .returns<OpcaoColuna[]>();

    for (const opcao of opcoes ?? []) {
      opcoesPorColuna[opcao.coluna_id] = [...(opcoesPorColuna[opcao.coluna_id] ?? []), opcao.valor];
    }
  }

  const tarefasPorCliente: Record<string, Tarefa> = {};
  for (const tarefa of tarefas ?? []) {
    tarefasPorCliente[tarefa.cliente_id] = tarefa;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Tabela de Tarefas — {formatCompetencia(competencia)}
        </h1>
        <div className="flex flex-wrap gap-2">
          {departamentos.map((dep) => (
            <Link
              key={dep.id}
              href={`/tarefas?departamento=${dep.id}`}
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

      {(colunas ?? []).length === 0 ? (
        <p className="text-sm text-muted">
          Este departamento ainda não tem colunas configuradas.
          {profile.role === 'admin' ? (
            <>
              {' '}
              <Link href={`/departamentos/${departamentoAtual.id}`} className="underline">
                Configurar colunas
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : (
        <TarefasTable
          clientes={clientes ?? []}
          colunas={colunas ?? []}
          opcoesPorColuna={opcoesPorColuna}
          tarefasPorCliente={tarefasPorCliente}
          profiles={profiles ?? []}
          departamentoId={departamentoAtual.id}
          competencia={competencia}
        />
      )}
    </div>
  );
}
