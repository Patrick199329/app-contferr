import Link from 'next/link';
import { formatCnpj } from '@/lib/cnpj';
import { getCurrentProfile } from '@/lib/supabase/profile';
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
  const isAdmin = profile?.role === 'admin';

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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        {isAdmin ? (
          <Link
            href="/clientes/novo"
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Novo cliente
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por razão social ou nome fantasia"
          className="w-full rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20"
        />
        {showInativos ? <input type="hidden" name="inativos" value="1" /> : null}
        <button
          type="submit"
          className="rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20"
        >
          Buscar
        </button>
      </form>

      <Link
        href={showInativos ? '/clientes' : '/clientes?inativos=1'}
        className="text-sm underline"
      >
        {showInativos ? 'Ver clientes ativos' : 'Ver clientes inativos'}
      </Link>

      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {(clientes ?? []).map((cliente) => (
          <li key={cliente.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{cliente.nome_fantasia}</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                {cliente.razao_social} — {formatCnpj(cliente.cnpj)}
              </p>
            </div>
            {isAdmin ? (
              <div className="flex gap-3">
                <Link href={`/clientes/${cliente.id}/editar`} className="text-sm underline">
                  Editar
                </Link>
                <form
                  action={async () => {
                    'use server';
                    await setClienteStatus(cliente.id, showInativos ? 'ativo' : 'inativo');
                  }}
                >
                  <button type="submit" className="text-sm underline">
                    {showInativos ? 'Reativar' : 'Desativar'}
                  </button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
        {(clientes ?? []).length === 0 ? (
          <li className="py-3 text-sm text-black/60 dark:text-white/60">
            Nenhum cliente encontrado.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
