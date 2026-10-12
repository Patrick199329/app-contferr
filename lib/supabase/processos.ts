import { createClient } from '@/lib/supabase/server';
import type {
  EtapaModelo,
  Processo,
  ProcessoEtapa,
  ProcessoEvento,
  ProcessoTaxaJucemg,
  TipoProcesso,
} from '@/types/processo';

// Tipos de serviço ativos de um departamento, pro seletor do formulário de
// criação de processo.
export async function getTiposProcesso(departamentoId: string) {
  const supabase = await createClient();

  const { data: tipos } = await supabase
    .from('tipos_processo')
    .select('*')
    .eq('departamento_id', departamentoId)
    .eq('status', 'ativo')
    .order('ordem')
    .returns<TipoProcesso[]>();

  return tipos ?? [];
}

// Etapas-modelo ativas de um tipo de serviço (usado só pra checagem de
// existência antes de liberar a criação — a cópia de verdade acontece dentro
// da RPC criar_processo).
export async function getEtapasModelo(tipoProcessoId: string) {
  const supabase = await createClient();

  const { data: etapas } = await supabase
    .from('etapas_modelo')
    .select('*')
    .eq('tipo_processo_id', tipoProcessoId)
    .eq('status', 'ativo')
    .order('ordem')
    .returns<EtapaModelo[]>();

  return etapas ?? [];
}

// Processo + etapas (já copiadas, ordenadas) + mapa de taxas JUCEMG por
// etapa + timeline de eventos — usado pela página de detalhe do processo.
export async function getProcessoDetalhe(id: string) {
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from('processos')
    .select('*')
    .eq('id', id)
    .single<Processo>();

  if (!processo) return null;

  const [{ data: etapas }, { data: eventos }] = await Promise.all([
    supabase
      .from('processo_etapas')
      .select('*')
      .eq('processo_id', id)
      .order('ordem')
      .returns<ProcessoEtapa[]>(),
    supabase
      .from('processo_eventos')
      .select('*')
      .eq('processo_id', id)
      .order('created_at', { ascending: false })
      .returns<ProcessoEvento[]>(),
  ]);

  const etapasList = etapas ?? [];
  const etapaIds = etapasList.map((e) => e.id);

  const { data: taxas } =
    etapaIds.length > 0
      ? await supabase
          .from('processo_taxas_jucemg')
          .select('*')
          .in('processo_etapa_id', etapaIds)
          .returns<ProcessoTaxaJucemg[]>()
      : { data: [] as ProcessoTaxaJucemg[] };

  const taxasPorEtapaId: Record<string, ProcessoTaxaJucemg> = {};
  for (const taxa of taxas ?? []) {
    taxasPorEtapaId[taxa.processo_etapa_id] = taxa;
  }

  return {
    processo,
    etapas: etapasList,
    taxasPorEtapaId,
    eventos: eventos ?? [],
  };
}
