import { notFound, redirect } from 'next/navigation';
import {
  createQuadroCampoOpcao,
  deleteQuadroCampoOpcao,
  moveQuadroCampoOpcao,
  setQuadroCampoOpcaoStatus,
  updateQuadroCampoOpcao,
} from '@/app/(dashboard)/departamentos/actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { OpcaoEditar } from '@/components/opcao-editar';
import { SimpleTextForm } from '@/components/simple-text-form';
import { Badge } from '@/components/ui/badge';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { COLUNA_TIPOS_COM_OPCOES } from '@/types/departamento';
import type { QuadroTarefaCampo, QuadroTarefaCampoOpcao } from '@/types/quadro-tarefa';

type OpcoesPageProps = {
  params: Promise<{ id: string; campoId: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function QuadroCampoOpcoesPage({ params, searchParams }: OpcoesPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id: departamentoId, campoId } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: campo } = await supabase
    .from('quadro_tarefas_campos')
    .select('*')
    .eq('id', campoId)
    .single<QuadroTarefaCampo>();

  if (!campo || !COLUNA_TIPOS_COM_OPCOES.includes(campo.tipo)) {
    notFound();
  }

  const { data: departamento } = await supabase
    .from('departamentos')
    .select('nome')
    .eq('id', departamentoId)
    .single();

  const { data: opcoes } = await supabase
    .from('quadro_tarefas_campos_opcoes')
    .select('*')
    .eq('campo_id', campoId)
    .order('status')
    .order('ordem')
    .returns<QuadroTarefaCampoOpcao[]>();

  const opcoesAtivas = (opcoes ?? []).filter((o) => o.status === 'ativo');

  // Valor é gravado por texto na tarefa (não por id da opção) — só pode
  // excluir de verdade se nenhuma tarefa tiver esse texto exato gravado
  // nesse campo.
  const { data: quadroTarefasDoDepartamento } = await supabase
    .from('quadro_tarefas')
    .select('valores')
    .eq('departamento_id', departamentoId);
  const valoresUsados = new Set(
    (quadroTarefasDoDepartamento ?? []).map((t) => t.valores?.[campoId]).filter(Boolean),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: 'Departamentos', href: '/departamentos' },
          { label: departamento?.nome ?? 'Departamento', href: `/departamentos/${departamentoId}` },
          { label: `Opções — ${campo.nome}` },
        ]}
      />
      <div>
        <h1 className="text-xl font-semibold">Opções — {campo.nome}</h1>
        <p className="text-sm text-muted">
          Adicionar, reordenar e desativar as opções deste dropdown. Desativar não apaga o valor de
          tarefas já preenchidas com ela — só some da lista para novos preenchimentos.
        </p>
      </div>

      {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}

      <ul className="app-card flex flex-col divide-y divide-border">
        {(opcoes ?? []).map((opcao) => {
          const index = opcoesAtivas.findIndex((o) => o.id === opcao.id);
          const semMovimentacao = !valoresUsados.has(opcao.valor);
          return (
            <li key={opcao.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <OpcaoEditar
                valor={opcao.valor}
                badge={opcao.status === 'inativo' ? <Badge tone="inactive">inativa</Badge> : null}
                action={updateQuadroCampoOpcao.bind(null, departamentoId, campoId, opcao.id)}
              />
              <div className="flex items-center gap-3">
                {opcao.status === 'ativo' ? (
                  <>
                    <form
                      action={moveQuadroCampoOpcao.bind(null, departamentoId, campoId, opcao.id, 'up')}
                    >
                      <button
                        type="submit"
                        disabled={index <= 0}
                        className="text-sm text-muted hover:underline disabled:opacity-30"
                      >
                        Subir
                      </button>
                    </form>
                    <form
                      action={moveQuadroCampoOpcao.bind(
                        null,
                        departamentoId,
                        campoId,
                        opcao.id,
                        'down',
                      )}
                    >
                      <button
                        type="submit"
                        disabled={index === -1 || index >= opcoesAtivas.length - 1}
                        className="text-sm text-muted hover:underline disabled:opacity-30"
                      >
                        Descer
                      </button>
                    </form>
                  </>
                ) : null}
                <form
                  action={setQuadroCampoOpcaoStatus.bind(
                    null,
                    departamentoId,
                    campoId,
                    opcao.id,
                    opcao.status === 'ativo' ? 'inativo' : 'ativo',
                  )}
                >
                  <button type="submit" className="text-sm text-muted hover:underline">
                    {opcao.status === 'ativo' ? 'Desativar' : 'Reativar'}
                  </button>
                </form>
                {semMovimentacao ? (
                  <ConfirmFormButton
                    action={deleteQuadroCampoOpcao.bind(null, departamentoId, campoId, opcao.id)}
                    confirmMessage={`Excluir a opção "${opcao.valor}"? Ela nunca foi usada em nenhuma tarefa. Essa ação não pode ser desfeita.`}
                    className="text-sm text-status-inactive hover:underline"
                  >
                    Excluir
                  </ConfirmFormButton>
                ) : null}
              </div>
            </li>
          );
        })}
        {(opcoes ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhuma opção cadastrada.</li>
        ) : null}
      </ul>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Nova opção</h2>
        <div className="app-card p-6">
          <SimpleTextForm
            action={createQuadroCampoOpcao.bind(null, campoId, departamentoId)}
            fieldName="valor"
            label="Valor da opção"
            submitLabel="Adicionar opção"
          />
        </div>
      </div>
    </div>
  );
}
