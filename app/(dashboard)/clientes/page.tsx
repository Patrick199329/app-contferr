import Link from 'next/link';
import { ClientesList, type ClienteListItem } from '@/components/clientes-list';
import { ButtonLink } from '@/components/ui/button';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import { deleteCliente, setClienteStatus } from './actions';

type ClientesPageProps = {
  searchParams: Promise<{ inativos?: string; erro?: string }>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const { inativos, erro } = await searchParams;
  const showInativos = inativos === '1';

  const profile = await getCurrentProfile();
  const podeGerenciar = podeGerenciarClientes(profile);

  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .eq('status', showInativos ? 'inativo' : 'ativo')
    .order('razao_social')
    .returns<Cliente[]>();

  const clienteIds = (clientes ?? []).map((c) => c.id);
  const [vinculos, { data: departamentos }, tarefasIds, quadroIds] = await Promise.all([
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('cliente_departamentos').select('cliente_id, departamento_id').in('cliente_id', lote),
    ),
    supabase.from('departamentos').select('id, nome, parent_id').eq('status', 'ativo').order('ordem'),
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('tarefas').select('cliente_id').in('cliente_id', lote),
    ),
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('quadro_tarefas').select('cliente_id').in('cliente_id', lote),
    ),
  ]);

  const nomeDep = new Map((departamentos ?? []).map((d) => [d.id, d.nome]));
  const idsPorCliente = new Map<string, string[]>();
  for (const v of vinculos) {
    idsPorCliente.set(v.cliente_id, [...(idsPorCliente.get(v.cliente_id) ?? []), v.departamento_id]);
  }

  // Só pode excluir de verdade quem nunca teve movimentação registrada —
  // senão é só desativar, pra não perder histórico.
  const comMovimentacao = new Set([
    ...tarefasIds.map((t) => t.cliente_id),
    ...quadroIds.map((q) => q.cliente_id).filter((id): id is string => !!id),
  ]);

  const clientesComContexto: ClienteListItem[] = (clientes ?? []).map((c) => {
    const departamentoIds = idsPorCliente.get(c.id) ?? [];
    return {
      ...c,
      departamentoIds,
      departamentoNomes: departamentoIds.map((id) => nomeDep.get(id) ?? '—'),
      semMovimentacao: !comMovimentacao.has(c.id),
    };
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        {podeGerenciar ? <ButtonLink href="/clientes/novo">Novo cliente</ButtonLink> : null}
      </div>

      <Link
        href={showInativos ? '/clientes' : '/clientes?inativos=1'}
        className="w-fit text-sm text-muted underline"
      >
        {showInativos ? 'Ver clientes ativos' : 'Ver clientes inativos'}
      </Link>

      {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}

      <ClientesList
        clientes={clientesComContexto}
        departamentos={departamentos ?? []}
        podeGerenciar={podeGerenciar}
        showInativos={showInativos}
        deleteCliente={deleteCliente}
        setClienteStatus={setClienteStatus}
      />
    </div>
  );
}
