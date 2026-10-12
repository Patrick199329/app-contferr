import { X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createProcesso } from '../actions';
import { ProcessoForm } from '@/components/processo-form';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { getTiposProcesso } from '@/lib/supabase/processos';
import { createClient } from '@/lib/supabase/server';

type NovoProcessoPageProps = {
  searchParams: Promise<{ departamento?: string; cliente?: string }>;
};

export default async function NovoProcessoPage({ searchParams }: NovoProcessoPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { departamento: departamentoId, cliente: clienteRecemCriadoId } = await searchParams;
  if (!departamentoId) notFound();

  const supabase = await createClient();

  // Ao contrário das Tarefas Avulsas, o seletor de cliente aqui não fica
  // restrito a quem já está vinculado a este departamento em
  // cliente_departamentos — um processo (principalmente Abertura de
  // empresa) pode mirar qualquer cliente já cadastrado na Contferr, mesmo
  // que ele nunca tenha sido ligado ao Societário antes.
  const [{ data: departamento }, { data: clientesDisponiveis }, membros, tiposProcesso] =
    await Promise.all([
      supabase.from('departamentos').select('id, nome, usa_processos').eq('id', departamentoId).single(),
      supabase
        .from('clientes')
        .select('id, nome_fantasia')
        .eq('status', 'ativo')
        .order('nome_fantasia'),
      getMembrosDoDepartamento(departamentoId),
      getTiposProcesso(departamentoId),
    ]);

  if (!departamento || !departamento.usa_processos) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Novo processo — {departamento.nome}</h1>
        <Link
          href={`/processos?departamento=${departamentoId}`}
          aria-label="Fechar"
          className="rounded-full p-2 text-muted hover:bg-surface-muted"
        >
          <X size={18} />
        </Link>
      </div>
      <div className="app-card p-6">
        <ProcessoForm
          action={createProcesso.bind(null, departamentoId)}
          tiposProcesso={tiposProcesso}
          clientesDisponiveis={clientesDisponiveis ?? []}
          membros={membros}
          defaultResponsavelId={profile.id}
          clienteRecemCriadoId={clienteRecemCriadoId}
        />
      </div>
    </div>
  );
}
