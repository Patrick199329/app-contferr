import { X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { QuadroTarefaForm } from '@/components/quadro-tarefa-form';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { getQuadroTarefasCampos } from '@/lib/supabase/quadro-tarefas-campos';
import { createClient } from '@/lib/supabase/server';
import {
  RECORRENCIA_FREQUENCIA_LABELS,
  type QuadroTarefa,
  type QuadroTarefaRecorrencia,
} from '@/types/quadro-tarefa';
import { cancelarRecorrencia, deleteQuadroTarefa, updateQuadroTarefa } from '../../actions';

type EditarQuadroTarefaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarQuadroTarefaPage({ params }: EditarQuadroTarefaPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { id } = await params;
  const supabase = await createClient();

  const { data: tarefa } = await supabase
    .from('quadro_tarefas')
    .select('*')
    .eq('id', id)
    .single<QuadroTarefa>();

  if (!tarefa) notFound();

  const [{ data: departamento }, { data: vinculos }, membros, { campos, opcoesPorCampo }] =
    await Promise.all([
      supabase.from('departamentos').select('id, nome').eq('id', tarefa.departamento_id).single(),
      supabase
        .from('cliente_departamentos')
        .select('cliente_id, responsavel_padrao_id')
        .eq('departamento_id', tarefa.departamento_id),
      getMembrosDoDepartamento(tarefa.departamento_id),
      getQuadroTarefasCampos(tarefa.departamento_id),
    ]);

  if (!departamento) notFound();

  const responsavelPadraoPorCliente: Record<string, string | null> = Object.fromEntries(
    (vinculos ?? []).map((v) => [v.cliente_id, v.responsavel_padrao_id]),
  );

  const { data: recorrencia } = tarefa.recorrencia_id
    ? await supabase
        .from('quadro_tarefas_recorrencias')
        .select('*')
        .eq('id', tarefa.recorrencia_id)
        .single<QuadroTarefaRecorrencia>()
    : { data: null };

  // Todos os clientes ativos, não só os vinculados a este departamento —
  // mesmo critério de app/(dashboard)/quadro-tarefas/nova/page.tsx.
  const { data: clientesDisponiveis } = await supabase
    .from('clientes')
    .select('id, nome_fantasia')
    .eq('status', 'ativo')
    .order('nome_fantasia');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar tarefa — {departamento.nome}</h1>
        <Link
          href={`/quadro-tarefas?departamento=${tarefa.departamento_id}`}
          aria-label="Fechar"
          className="rounded-full p-2 text-muted hover:bg-surface-muted"
        >
          <X size={18} />
        </Link>
      </div>

      {recorrencia ? (
        <div className="app-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          {recorrencia.ativa ? (
            <>
              <span>
                Esta tarefa se repete a cada {recorrencia.intervalo}{' '}
                {RECORRENCIA_FREQUENCIA_LABELS[recorrencia.frequencia]}.
              </span>
              <form action={cancelarRecorrencia.bind(null, recorrencia.id, id)}>
                <button type="submit" className="text-muted hover:underline">
                  Cancelar recorrência
                </button>
              </form>
            </>
          ) : (
            <span className="text-muted">Recorrência cancelada — não gera mais ocorrências.</span>
          )}
        </div>
      ) : null}

      <div className="app-card p-6">
        <QuadroTarefaForm
          action={updateQuadroTarefa.bind(null, id, tarefa.departamento_id, tarefa.recorrencia_id)}
          clientesDisponiveis={clientesDisponiveis ?? []}
          membros={membros}
          campos={campos}
          opcoesPorCampo={opcoesPorCampo}
          responsavelPadraoPorCliente={responsavelPadraoPorCliente}
          recorrenciaAtiva={recorrencia?.ativa ?? false}
          initialValues={{
            titulo: tarefa.titulo,
            descricao: tarefa.descricao,
            responsavelId: tarefa.responsavel_id,
            clienteId: tarefa.cliente_id,
            prazo: tarefa.prazo,
            valores: tarefa.valores,
          }}
          submitLabel="Salvar alterações"
        />
      </div>

      <ConfirmFormButton
        action={deleteQuadroTarefa.bind(null, id, tarefa.departamento_id)}
        confirmMessage={`Excluir a tarefa "${tarefa.titulo}"? Essa ação não pode ser desfeita.`}
        className="w-fit text-sm text-status-inactive hover:underline"
      >
        Excluir tarefa
      </ConfirmFormButton>
    </div>
  );
}
