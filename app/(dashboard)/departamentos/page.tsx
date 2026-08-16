import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import { setDepartamentoStatus } from './actions';

export default async function DepartamentosPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: departamentos } = await supabase
    .from('departamentos')
    .select('*')
    .order('status')
    .order('ordem')
    .returns<Departamento[]>();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Departamentos</h1>
        <Link
          href="/departamentos/novo"
          className="rounded bg-foreground px-4 py-2 text-sm text-background"
        >
          Novo departamento
        </Link>
      </div>

      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {(departamentos ?? []).map((dep) => (
          <li key={dep.id} className="flex items-center justify-between py-3">
            <Link href={`/departamentos/${dep.id}`} className="font-medium underline">
              {dep.nome}
              {dep.status === 'inativo' ? ' (inativo)' : ''}
            </Link>
            <form
              action={async () => {
                'use server';
                await setDepartamentoStatus(dep.id, dep.status === 'ativo' ? 'inativo' : 'ativo');
              }}
            >
              <button type="submit" className="text-sm underline">
                {dep.status === 'ativo' ? 'Desativar' : 'Reativar'}
              </button>
            </form>
          </li>
        ))}
        {(departamentos ?? []).length === 0 ? (
          <li className="py-3 text-sm text-black/60 dark:text-white/60">
            Nenhum departamento cadastrado.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
