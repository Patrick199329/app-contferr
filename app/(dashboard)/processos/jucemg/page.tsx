import { redirect } from 'next/navigation';
import { DepartamentoTabs } from '@/components/departamento-tabs';
import { ProcessosJucemgList, type LinhaTaxaJucemg } from '@/components/processos-jucemg-list';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import type { Processo, ProcessoEtapa, ProcessoTaxaJucemg } from '@/types/processo';

type ProcessosJucemgPageProps = {
  searchParams: Promise<{ departamento?: string }>;
};

export default async function ProcessosJucemgPage({ searchParams }: ProcessosJucemgPageProps) {
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
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Taxas JUCEMG</h1>
        <p className="text-sm text-muted">
          Você ainda não tem acesso a nenhum departamento com Processos habilitado.
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam } = await searchParams;
  const departamentoAtual =
    selecionaveis.find((d) => d.id === departamentoParam) ?? selecionaveis[0];

  const { data: processos } = await supabase
    .from('processos')
    .select('*')
    .eq('departamento_id', departamentoAtual.id)
    .returns<Processo[]>();

  const processoIds = (processos ?? []).map((p) => p.id);
  const { data: etapasComTaxa } =
    processoIds.length > 0
      ? await supabase
          .from('processo_etapas')
          .select('*')
          .in('processo_id', processoIds)
          .eq('trava_por_taxa_jucemg', true)
          .returns<ProcessoEtapa[]>()
      : { data: [] as ProcessoEtapa[] };

  const etapaIds = (etapasComTaxa ?? []).map((e) => e.id);
  const { data: taxas } =
    etapaIds.length > 0
      ? await supabase
          .from('processo_taxas_jucemg')
          .select('*')
          .in('processo_etapa_id', etapaIds)
          .returns<ProcessoTaxaJucemg[]>()
      : { data: [] as ProcessoTaxaJucemg[] };

  const processoPorId = new Map((processos ?? []).map((p) => [p.id, p]));
  const etapaPorId = new Map((etapasComTaxa ?? []).map((e) => [e.id, e]));

  const clienteIds = [
    ...new Set((processos ?? []).map((p) => p.cliente_id).filter((id): id is string => !!id)),
  ];
  const clientes = await selectEmLotes(clienteIds, (lote) =>
    supabase.from('clientes').select('id, nome_fantasia').in('id', lote),
  );
  const clientePorId = new Map(clientes.map((c) => [c.id, c.nome_fantasia]));

  const linhas: LinhaTaxaJucemg[] = (taxas ?? [])
    .map((taxa) => {
      const etapa = etapaPorId.get(taxa.processo_etapa_id);
      const processo = etapa ? processoPorId.get(etapa.processo_id) : undefined;
      if (!etapa || !processo) return null;
      const clienteNome = processo.cliente_id
        ? (clientePorId.get(processo.cliente_id) ?? '—')
        : (processo.cliente_nome_avulso ?? '—');
      return { taxa, processoId: processo.id, etapaNome: etapa.nome, clienteNome };
    })
    .filter((l): l is LinhaTaxaJucemg => l !== null);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Taxas JUCEMG</h1>
        <DepartamentoTabs
          departamentos={departamentos}
          ativoId={departamentoAtual.id}
          basePath="/processos/jucemg"
        />
      </div>

      <ProcessosJucemgList linhas={linhas} />
    </div>
  );
}
