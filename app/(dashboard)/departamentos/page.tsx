import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button';
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Departamentos</h1>
        <ButtonLink href="/departamentos/novo">Novo departamento</ButtonLink>
      </div>

      <ul className="app-card flex flex-col divide-y divide-border">
        {(departamentos ?? []).map((dep) => (
          <li key={dep.id} className="flex items-center justify-between p-4">
            <Link href={`/departamentos/${dep.id}`} className="font-medium hover:underline">
              {dep.nome}
              {dep.status === 'inativo' ? ' (inativo)' : ''}
            </Link>
            <form
              action={async () => {
                'use server';
                await setDepartamentoStatus(dep.id, dep.status === 'ativo' ? 'inativo' : 'ativo');
              }}
            >
              <button type="submit" className="text-sm text-muted hover:underline">
                {dep.status === 'ativo' ? 'Desativar' : 'Reativar'}
              </button>
            </form>
          </li>
        ))}
        {(departamentos ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum departamento cadastrado.</li>
        ) : null}
      </ul>
    </div>
  );
}
