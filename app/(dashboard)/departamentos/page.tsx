import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Fragment } from 'react';
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

  const topLevel = (departamentos ?? []).filter((d) => !d.parent_id);
  const filhosPorPai = new Map<string, Departamento[]>();
  for (const dep of departamentos ?? []) {
    if (dep.parent_id) {
      filhosPorPai.set(dep.parent_id, [...(filhosPorPai.get(dep.parent_id) ?? []), dep]);
    }
  }

  const linha = (dep: Departamento, indent = false) => (
    <li
      key={dep.id}
      className={`flex items-center justify-between p-4 ${indent ? 'pl-10 text-sm' : ''}`}
    >
      <Link href={`/departamentos/${dep.id}`} className="font-medium hover:underline">
        {indent ? '↳ ' : ''}
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
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Departamentos</h1>
        <ButtonLink href="/departamentos/novo">Novo departamento</ButtonLink>
      </div>

      <ul className="app-card flex flex-col divide-y divide-border">
        {topLevel.map((dep) => (
          <Fragment key={dep.id}>
            {linha(dep)}
            {(filhosPorPai.get(dep.id) ?? []).map((filho) => linha(filho, true))}
          </Fragment>
        ))}
        {(departamentos ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum departamento cadastrado.</li>
        ) : null}
      </ul>
    </div>
  );
}
