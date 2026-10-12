import { notFound, redirect } from 'next/navigation';
import {
  createEtapaModelo,
  deleteEtapaModelo,
  moveEtapaModelo,
  setEtapaModeloStatus,
} from '@/app/(dashboard)/departamentos/actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { EtapaModeloForm } from '@/components/etapa-modelo-form';
import { EtapaModeloItem } from '@/components/etapa-modelo-item';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { EtapaModelo, TipoProcesso } from '@/types/processo';

type EtapasPageProps = {
  params: Promise<{ id: string; tipoId: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EtapasPage({ params, searchParams }: EtapasPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id: departamentoId, tipoId } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: departamento }, { data: tipoProcesso }] = await Promise.all([
    supabase.from('departamentos').select('nome').eq('id', departamentoId).single(),
    supabase.from('tipos_processo').select('*').eq('id', tipoId).single<TipoProcesso>(),
  ]);

  if (!departamento || !tipoProcesso) notFound();

  const { data: etapas } = await supabase
    .from('etapas_modelo')
    .select('*')
    .eq('tipo_processo_id', tipoId)
    .order('status')
    .order('ordem')
    .returns<EtapaModelo[]>();

  const etapasAtivas = (etapas ?? []).filter((e) => e.status === 'ativo');

  // Só pode excluir de verdade se nenhum processo já tiver copiado essa
  // etapa do modelo — senão é só desativar, pra não perder o histórico.
  const etapaIds = (etapas ?? []).map((e) => e.id);
  const { data: processoEtapas } =
    etapaIds.length > 0
      ? await supabase.from('processo_etapas').select('etapa_modelo_id').in('etapa_modelo_id', etapaIds)
      : { data: [] };
  const etapasComMovimentacao = new Set(
    (processoEtapas ?? []).map((e) => e.etapa_modelo_id).filter((v): v is string => !!v),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: 'Departamentos', href: '/departamentos' },
          { label: departamento.nome, href: `/departamentos/${departamentoId}` },
          { label: `Etapas — ${tipoProcesso.nome}` },
        ]}
      />
      <div>
        <h1 className="text-xl font-semibold">Etapas — {tipoProcesso.nome}</h1>
        <p className="text-sm text-muted">
          Sequência que será copiada automaticamente pra dentro de todo processo criado com este
          tipo de serviço. Mudar aqui não afeta processos já criados.
        </p>
      </div>

      {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}

      <ul className="app-card flex flex-col divide-y divide-border">
        {(etapas ?? []).map((etapa) => {
          const index = etapasAtivas.findIndex((e) => e.id === etapa.id);
          const semMovimentacao = !etapasComMovimentacao.has(etapa.id);
          return (
            <EtapaModeloItem
              key={etapa.id}
              departamentoId={departamentoId}
              tipoProcessoId={tipoId}
              etapa={etapa}
              podeSubir={index > 0}
              podeDescer={index !== -1 && index < etapasAtivas.length - 1}
              semMovimentacao={semMovimentacao}
              moveUpAction={moveEtapaModelo.bind(null, departamentoId, tipoId, etapa.id, 'up')}
              moveDownAction={moveEtapaModelo.bind(null, departamentoId, tipoId, etapa.id, 'down')}
              toggleStatusAction={setEtapaModeloStatus.bind(
                null,
                departamentoId,
                tipoId,
                etapa.id,
                etapa.status === 'ativo' ? 'inativo' : 'ativo',
              )}
              deleteAction={deleteEtapaModelo.bind(null, departamentoId, tipoId, etapa.id)}
            />
          );
        })}
        {(etapas ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhuma etapa cadastrada.</li>
        ) : null}
      </ul>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Nova etapa</h2>
        <div className="app-card p-6">
          <EtapaModeloForm action={createEtapaModelo.bind(null, departamentoId, tipoId)} />
        </div>
      </div>
    </div>
  );
}
