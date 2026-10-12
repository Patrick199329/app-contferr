import { X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { QuadroTarefaForm } from '@/components/quadro-tarefa-form';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { getQuadroTarefasCampos } from '@/lib/supabase/quadro-tarefas-campos';
import { createClient } from '@/lib/supabase/server';
import { createQuadroTarefa } from '../actions';

type NovaQuadroTarefaPageProps = {
  searchParams: Promise<{ departamento?: string }>;
};

export default async function NovaQuadroTarefaPage({ searchParams }: NovaQuadroTarefaPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { departamento: departamentoId } = await searchParams;
  if (!departamentoId) notFound();

  const supabase = await createClient();

  const [{ data: departamento }, { data: vinculos }, membros, { campos, opcoesPorCampo }] =
    await Promise.all([
      supabase.from('departamentos').select('id, nome').eq('id', departamentoId).single(),
      supabase
        .from('cliente_departamentos')
        .select('cliente_id, responsavel_padrao_id')
        .eq('departamento_id', departamentoId),
      getMembrosDoDepartamento(departamentoId),
      getQuadroTarefasCampos(departamentoId),
    ]);

  if (!departamento) notFound();

  const responsavelPadraoPorCliente: Record<string, string | null> = Object.fromEntries(
    (vinculos ?? []).map((v) => [v.cliente_id, v.responsavel_padrao_id]),
  );

  // Todos os clientes ativos, não só os vinculados a este departamento —
  // uma Tarefa Avulsa pode ser aberta pra qualquer cliente, independente de
  // quem cuida dele normalmente (ex.: pedido avulso de outro setor).
  const { data: clientesDisponiveis } = await supabase
    .from('clientes')
    .select('id, nome_fantasia')
    .eq('status', 'ativo')
    .order('nome_fantasia');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Nova tarefa — {departamento.nome}</h1>
        <Link
          href={`/quadro-tarefas?departamento=${departamentoId}`}
          aria-label="Fechar"
          className="rounded-full p-2 text-muted hover:bg-surface-muted"
        >
          <X size={18} />
        </Link>
      </div>
      <div className="app-card p-6">
        <QuadroTarefaForm
          action={createQuadroTarefa.bind(null, departamentoId)}
          clientesDisponiveis={clientesDisponiveis ?? []}
          membros={membros}
          campos={campos}
          opcoesPorCampo={opcoesPorCampo}
          responsavelPadraoPorCliente={responsavelPadraoPorCliente}
          defaultResponsavelId={profile.id}
          submitLabel="Criar tarefa"
        />
      </div>
    </div>
  );
}
