import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DepartamentoTabs } from '@/components/departamento-tabs';
import { ProcessosList } from '@/components/processos-list';
import { ButtonLink } from '@/components/ui/button';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import type { Processo, ProcessoEtapa, TipoProcesso } from '@/types/processo';

type ProcessosPageProps = {
  searchParams: Promise<{ departamento?: string; todas?: string }>;
};

export default async function ProcessosPage({ searchParams }: ProcessosPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem')
    .returns<Departamento[]>();

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_processos');
  const permitidos = await getDepartamentosPermitidos();
  const departamentos = comFerramenta.filter((d) => podeAcessarDepartamento(permitidos, d.id));

  const paisComFilhos = new Set(
    departamentos.filter((d) => d.parent_id).map((d) => d.parent_id as string),
  );
  const selecionaveis = departamentos.filter((d) => !paisComFilhos.has(d.id));

  if (selecionaveis.length === 0) {
    const semDepartamentos = (todosDepartamentos ?? []).length === 0;
    const semFerramentaHabilitada = !semDepartamentos && comFerramenta.length === 0;
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Processos</h1>
        <p className="text-sm text-muted">
          {semDepartamentos
            ? 'Nenhum departamento cadastrado ainda.'
            : semFerramentaHabilitada
              ? 'Nenhum departamento tem Processos habilitado. Habilite em Departamentos › Ferramentas habilitadas.'
              : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam, todas } = await searchParams;
  const departamentoAtual =
    selecionaveis.find((d) => d.id === departamentoParam) ?? selecionaveis[0];
  const mostrarTodos = todas === '1';

  let query = supabase
    .from('processos')
    .select('*')
    .eq('departamento_id', departamentoAtual.id)
    .order('created_at', { ascending: false });

  if (!mostrarTodos) {
    query = query.eq('status', 'ativo');
  }

  const { data: processos } = await query.returns<Processo[]>();

  const { data: tiposProcesso } = await supabase
    .from('tipos_processo')
    .select('*')
    .eq('departamento_id', departamentoAtual.id)
    .returns<TipoProcesso[]>();
  const tiposPorId = Object.fromEntries((tiposProcesso ?? []).map((t) => [t.id, t]));

  const processoIds = (processos ?? []).map((p) => p.id);
  const { data: etapas } =
    processoIds.length > 0
      ? await supabase
          .from('processo_etapas')
          .select('*')
          .in('processo_id', processoIds)
          .order('ordem')
          .returns<ProcessoEtapa[]>()
      : { data: [] as ProcessoEtapa[] };
  const etapasPorProcessoId: Record<string, ProcessoEtapa[]> = {};
  for (const etapa of etapas ?? []) {
    (etapasPorProcessoId[etapa.processo_id] ??= []).push(etapa);
  }

  const clienteIds = [
    ...new Set((processos ?? []).map((p) => p.cliente_id).filter((id): id is string => !!id)),
  ];
  const pessoaIds = [
    ...new Set((processos ?? []).map((p) => p.responsavel_id).filter((id): id is string => !!id)),
  ];

  const [clientes, profiles] = await Promise.all([
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('clientes').select('id, nome_fantasia, google_drive_url').in('id', lote),
    ),
    selectEmLotes(pessoaIds, (lote) => supabase.from('profiles').select('id, nome, email').in('id', lote)),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Processos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DepartamentoTabs
            departamentos={departamentos}
            ativoId={departamentoAtual.id}
            basePath="/processos"
            extraQuery={mostrarTodos ? '&todas=1' : ''}
          />
          <ButtonLink href={`/processos/jucemg?departamento=${departamentoAtual.id}`} variant="secondary">
            Taxas JUCEMG
          </ButtonLink>
          <ButtonLink href={`/processos/novo?departamento=${departamentoAtual.id}`}>
            Novo processo
          </ButtonLink>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/processos?departamento=${departamentoAtual.id}${mostrarTodos ? '' : '&todas=1'}`}
          className="text-muted underline"
        >
          {mostrarTodos ? 'Ver só os ativos' : 'Ver todos (inclusive concluídos/cancelados)'}
        </Link>
      </div>

      <ProcessosList
        processos={processos ?? []}
        tiposPorId={tiposPorId}
        etapasPorProcessoId={etapasPorProcessoId}
        clientes={clientes ?? []}
        profiles={profiles ?? []}
      />
    </div>
  );
}
