import { notFound, redirect } from 'next/navigation';
import {
  createOpcao,
  deleteOpcao,
  moveOpcao,
  setOpcaoStatus,
  updateOpcao,
} from '@/app/(dashboard)/departamentos/actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { OpcaoEditar } from '@/components/opcao-editar';
import { SimpleTextForm } from '@/components/simple-text-form';
import { Badge } from '@/components/ui/badge';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { COLUNA_TIPOS_COM_OPCOES, type Coluna, type OpcaoColuna } from '@/types/departamento';

type OpcoesPageProps = {
  params: Promise<{ id: string; colunaId: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function OpcoesPage({ params, searchParams }: OpcoesPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id: departamentoId, colunaId } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: coluna } = await supabase
    .from('colunas')
    .select('*')
    .eq('id', colunaId)
    .single<Coluna>();

  if (!coluna || !COLUNA_TIPOS_COM_OPCOES.includes(coluna.tipo)) {
    notFound();
  }

  const { data: departamento } = await supabase
    .from('departamentos')
    .select('nome')
    .eq('id', departamentoId)
    .single();

  const { data: opcoes } = await supabase
    .from('opcoes_coluna')
    .select('*')
    .eq('coluna_id', colunaId)
    .order('status')
    .order('ordem')
    .returns<OpcaoColuna[]>();

  const opcoesAtivas = (opcoes ?? []).filter((o) => o.status === 'ativo');

  // Valor é gravado por texto na tarefa (não por id da opção) — só pode
  // excluir de verdade se nenhuma tarefa tiver esse texto exato gravado
  // nessa coluna.
  const { data: tarefasDoDepartamento } = await supabase
    .from('tarefas')
    .select('valores')
    .eq('departamento_id', departamentoId);
  const valoresUsados = new Set(
    (tarefasDoDepartamento ?? []).map((t) => t.valores?.[colunaId]).filter(Boolean),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: 'Departamentos', href: '/departamentos' },
          { label: departamento?.nome ?? 'Departamento', href: `/departamentos/${departamentoId}` },
          { label: `Opções — ${coluna.nome}` },
        ]}
      />
      <div>
        <h1 className="text-xl font-semibold">Opções — {coluna.nome}</h1>
        <p className="text-sm text-muted">
          Adicionar, reordenar e desativar as opções deste dropdown. Desativar não apaga o valor de
          registros já preenchidos com ela — só some da lista para novos preenchimentos.
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
                action={updateOpcao.bind(null, departamentoId, colunaId, opcao.id)}
              />
              <div className="flex items-center gap-3">
                {opcao.status === 'ativo' ? (
                  <>
                    <form action={moveOpcao.bind(null, departamentoId, colunaId, opcao.id, 'up')}>
                      <button
                        type="submit"
                        disabled={index <= 0}
                        className="text-sm text-muted hover:underline disabled:opacity-30"
                      >
                        Subir
                      </button>
                    </form>
                    <form action={moveOpcao.bind(null, departamentoId, colunaId, opcao.id, 'down')}>
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
                  action={setOpcaoStatus.bind(
                    null,
                    departamentoId,
                    colunaId,
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
                    action={deleteOpcao.bind(null, departamentoId, colunaId, opcao.id)}
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
            action={createOpcao.bind(null, colunaId, departamentoId)}
            fieldName="valor"
            label="Valor da opção"
            submitLabel="Adicionar opção"
          />
        </div>
      </div>
    </div>
  );
}
