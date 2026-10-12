import { notFound, redirect } from 'next/navigation';
import { deleteProcesso, updateProcessoControleGeral } from '../actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { ProcessoControleGeralForm } from '@/components/processo-controle-geral-form';
import { ProcessoEtapasStepper } from '@/components/processo-etapas-stepper';
import { TaxaJucemgCard } from '@/components/taxa-jucemg-card';
import { Badge } from '@/components/ui/badge';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { getProcessoDetalhe } from '@/lib/supabase/processos';
import { createClient } from '@/lib/supabase/server';
import type { TipoProcesso } from '@/types/processo';

type ProcessoDetalhePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function ProcessoDetalhePage({ params, searchParams }: ProcessoDetalhePageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { id } = await params;
  const { erro } = await searchParams;
  const detalhe = await getProcessoDetalhe(id);
  if (!detalhe) notFound();

  const { processo, etapas, taxasPorEtapaId, eventos } = detalhe;

  const supabase = await createClient();
  const [{ data: departamento }, { data: tipoProcesso }, { data: cliente }, membros] = await Promise.all([
    supabase.from('departamentos').select('id, nome').eq('id', processo.departamento_id).single(),
    supabase.from('tipos_processo').select('*').eq('id', processo.tipo_processo_id).single<TipoProcesso>(),
    processo.cliente_id
      ? supabase.from('clientes').select('nome_fantasia').eq('id', processo.cliente_id).single()
      : Promise.resolve({ data: null }),
    getMembrosDoDepartamento(processo.departamento_id),
  ]);

  if (!departamento) notFound();

  const nomeCliente = cliente?.nome_fantasia ?? processo.cliente_nome_avulso ?? '—';
  // Toda etapa travada por taxa JUCEMG ainda não concluída precisa do card —
  // não só quando ela é a "primeira" etapa pendente da lista. Etapas
  // anteriores só "Em andamento" (não concluídas) não bloqueiam mais nada
  // relacionado à taxa (ver migration 20260923130000), então o card não pode
  // ficar escondido só porque alguém ainda não marcou uma etapa anterior
  // como concluída.
  const etapasComTaxaPendente = etapas.filter((e) => e.trava_por_taxa_jucemg && e.status !== 'concluida');
  const concluidas = etapas.filter((e) => e.status === 'concluida').length;
  const progresso = etapas.length > 0 ? Math.round((concluidas / etapas.length) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: 'Processos', href: `/processos?departamento=${processo.departamento_id}` },
          { label: nomeCliente },
        ]}
      />

      {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}

      <div className="app-card flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {tipoProcesso ? (
              <span
                className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
                style={{ backgroundColor: tipoProcesso.cor }}
              >
                {tipoProcesso.codigo}
              </span>
            ) : null}
            <h1 className="text-xl font-semibold">{nomeCliente}</h1>
            {processo.status !== 'ativo' ? (
              <Badge tone={processo.status === 'concluido' ? 'active' : 'inactive'}>
                {processo.status === 'concluido' ? 'Concluído' : 'Cancelado'}
              </Badge>
            ) : null}
          </div>
          {processo.status !== 'concluido' ? (
            <ConfirmFormButton
              action={deleteProcesso.bind(null, processo.id, processo.departamento_id)}
              confirmMessage="Excluir este processo? As etapas, a taxa JUCEMG e o histórico de auditoria dele são apagados junto. Essa ação não pode ser desfeita."
              className="text-sm text-status-inactive hover:underline"
            >
              Excluir processo
            </ConfirmFormButton>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          {tipoProcesso?.nome ?? '—'}
          {processo.protocolo_geral ? ` • Protocolo ${processo.protocolo_geral}` : ''} • incluído em{' '}
          {new Date(processo.created_at).toLocaleString('pt-BR')}
        </p>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
          </div>
          <span className="text-xs text-muted">{progresso}% concluído</span>
        </div>
      </div>

      {etapasComTaxaPendente.map((etapa) => {
        const taxa = taxasPorEtapaId[etapa.id];
        return taxa ? (
          // key inclui taxa.updated_at: depois de um form action bem-sucedido,
          // o React reseta os campos não controlados do form pro defaultValue
          // original — sem isso, o <select> de Situação volta a mostrar o
          // valor antigo mesmo o banco já tendo salvo o novo corretamente.
          // Trocar a key força remontar com o defaultValue fresco do servidor.
          <TaxaJucemgCard
            key={`${etapa.id}-${taxa.updated_at}`}
            processoId={processo.id}
            etapa={etapa}
            taxa={taxa}
          />
        ) : null;
      })}

      <ProcessoEtapasStepper etapas={etapas} taxasPorEtapaId={taxasPorEtapaId} membros={membros} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Histórico de auditoria</h2>
        <ul className="app-card flex flex-col divide-y divide-border">
          {eventos.map((evento) => (
            <li key={evento.id} className="p-4">
              <p className="text-sm">{evento.descricao}</p>
              <p className="text-xs text-muted">{new Date(evento.created_at).toLocaleString('pt-BR')}</p>
            </li>
          ))}
          {eventos.length === 0 ? (
            <li className="p-4 text-sm text-muted">Nenhum evento registrado.</li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Controle geral</h2>
        <div className="app-card p-6">
          {/* key com updated_at: mesmo motivo do TaxaJucemgCard acima — sem
              isso, depois de salvar os campos não controlados voltariam a
              mostrar o valor de antes do save, mesmo o banco já correto. */}
          <ProcessoControleGeralForm
            key={processo.updated_at}
            action={updateProcessoControleGeral.bind(null, processo.id, processo.departamento_id)}
            processo={processo}
            membros={membros}
          />
        </div>
      </div>
    </div>
  );
}
