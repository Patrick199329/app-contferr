import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DepartamentoTabs } from '@/components/departamento-tabs';
import { HistoricoTable } from '@/components/historico-table';
import { currentCompetencia, formatCompetencia, shiftCompetencia } from '@/lib/competencia';
import { colunaAplicavelNoMes } from '@/lib/colunas-periodicidade';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
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

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_tarefas_padrao');
  const permitidos = await getDepartamentosPermitidos();
  const departamentos = comFerramenta.filter((d) => podeAcessarDepartamento(permitidos, d.id));

  // Departamentos que só agrupam subdepartamentos não têm colunas/tarefas
  // próprias — nunca podem virar a aba selecionada (só aparecem como dropdown).
  const paisComFilhos = new Set(
    departamentos.filter((d) => d.parent_id).map((d) => d.parent_id as string),
  );
  const selecionaveis = departamentos.filter((d) => !paisComFilhos.has(d.id));

  if (selecionaveis.length === 0) {
    const semDepartamentos = (todosDepartamentos ?? []).length === 0;
    const semFerramentaHabilitada = !semDepartamentos && comFerramenta.length === 0;
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Histórico de Competências</h1>
        <p className="text-sm text-muted">
          {semDepartamentos
            ? 'Nenhum departamento cadastrado ainda.'
            : semFerramentaHabilitada
              ? 'Nenhum departamento tem a Tabela de Tarefas habilitada. Habilite em Departamentos › Ferramentas habilitadas.'
              : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam, competencia: competenciaParam } = await searchParams;
  const departamentoAtual =
    selecionaveis.find((d) => d.id === departamentoParam) ?? selecionaveis[0];
  const competencia = competenciaParam ?? shiftCompetencia(currentCompetencia(), -1);
  const podeAvancar = competencia < currentCompetencia();

  const { data: tarefas } = await supabase
    .from('tarefas')
    .select('*')
    .eq('departamento_id', departamentoAtual.id)
    .eq('competencia', competencia)
    .returns<Tarefa[]>();

  const clienteIds = [...new Set((tarefas ?? []).map((t) => t.cliente_id))];

  const [clientes, { data: colunas }, { data: profiles }] = await Promise.all([
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('clientes').select('*').in('id', lote).returns<Cliente[]>(),
    ),
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

  const colunasDoMes = (colunas ?? []).filter((c) => colunaAplicavelNoMes(c, competencia));

  const tarefasPorCliente: Record<string, Tarefa> = {};
  for (const tarefa of tarefas ?? []) {
    tarefasPorCliente[tarefa.cliente_id] = tarefa;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Histórico — {formatCompetencia(competencia)}</h1>
        <DepartamentoTabs
          departamentos={departamentos}
          ativoId={departamentoAtual.id}
          basePath="/historico"
          extraQuery={`&competencia=${competencia}`}
        />
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

      <HistoricoTable
        clientes={clientesOrdenados}
        colunas={colunasDoMes}
        tarefasPorCliente={tarefasPorCliente}
        profiles={profiles ?? []}
      />
    </div>
  );
}
