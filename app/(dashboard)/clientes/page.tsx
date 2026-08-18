import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { formatCnpj } from '@/lib/cnpj';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import { setClienteStatus } from './actions';

type ClientesPageProps = {
  searchParams: Promise<{ q?: string; inativos?: string }>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const { q = '', inativos } = await searchParams;
  const showInativos = inativos === '1';

  const profile = await getCurrentProfile();
  const podeGerenciar = podeGerenciarClientes(profile);

  const supabase = await createClient();
  let query = supabase
    .from('clientes')
    .select('*')
    .eq('status', showInativos ? 'inativo' : 'ativo')
    .order('razao_social');

  if (q) {
    query = query.or(`razao_social.ilike.%${q}%,nome_fantasia.ilike.%${q}%`);
  }

  const { data: clientes } = await query.returns<Cliente[]>();

  const clienteIds = (clientes ?? []).map((c) => c.id);
  const [{ data: vinculos }, { data: departamentos }] = await Promise.all([
    clienteIds.length > 0
      ? supabase
          .from('cliente_departamentos')
          .select('cliente_id, departamento_id')
          .in('cliente_id', clienteIds)
      : Promise.resolve({ data: [] as { cliente_id: string; departamento_id: string }[] }),
    supabase.from('departamentos').select('id, nome'),
  ]);

  const nomeDep = new Map((departamentos ?? []).map((d) => [d.id, d.nome]));
  const depsPorCliente = new Map<string, string[]>();
  for (const v of vinculos ?? []) {
    const atual = depsPorCliente.get(v.cliente_id) ?? [];
    atual.push(nomeDep.get(v.departamento_id) ?? '—');
    depsPorCliente.set(v.cliente_id, atual);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        {podeGerenciar ? <ButtonLink href="/clientes/novo">Novo cliente</ButtonLink> : null}
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por razão social ou nome fantasia"
          className="input"
        />
        {showInativos ? <input type="hidden" name="inativos" value="1" /> : null}
        <button
          type="submit"
          className="shrink-0 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-muted"
        >
          Buscar
        </button>
      </form>

      <Link
        href={showInativos ? '/clientes' : '/clientes?inativos=1'}
        className="w-fit text-sm text-muted underline"
      >
        {showInativos ? 'Ver clientes ativos' : 'Ver clientes inativos'}
      </Link>

      <ul className="app-card flex flex-col divide-y divide-border">
        {(clientes ?? []).map((cliente) => {
          const deps = depsPorCliente.get(cliente.id) ?? [];
          return (
            <li key={cliente.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                  {cliente.nome_fantasia}
                </Link>
                <p className="truncate text-sm text-muted">
                  {cliente.razao_social} — {formatCnpj(cliente.cnpj)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {deps.length > 0 ? (
                    deps.map((d) => (
                      <Badge key={d} tone="neutral">
                        {d}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted">Nenhum departamento vinculado</span>
                  )}
                </div>
              </div>
              {podeGerenciar ? (
                <div className="flex shrink-0 gap-3">
                  <Link
                    href={`/clientes/${cliente.id}/editar`}
                    className="text-sm text-muted hover:underline"
                  >
                    Editar
                  </Link>
                  <form
                    action={async () => {
                      'use server';
                      await setClienteStatus(cliente.id, showInativos ? 'ativo' : 'inativo');
                    }}
                  >
                    <button type="submit" className="text-sm text-muted hover:underline">
                      {showInativos ? 'Reativar' : 'Desativar'}
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          );
        })}
        {(clientes ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum cliente encontrado.</li>
        ) : null}
      </ul>
    </div>
  );
}
