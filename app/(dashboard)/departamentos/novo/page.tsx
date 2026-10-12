import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DepartamentoForm } from '@/components/departamento-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import { createDepartamento } from '../actions';

export default async function NovoDepartamentoPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const supabase = await createClient();
  const { data: departamentosPai } = await supabase
    .from('departamentos')
    .select('*')
    .is('parent_id', null)
    .order('nome')
    .returns<Departamento[]>();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Departamentos', href: '/departamentos' }, { label: 'Novo departamento' }]} />
      <h1 className="text-xl font-semibold">Novo departamento</h1>
      <div className="app-card p-6">
        <DepartamentoForm action={createDepartamento} departamentosPai={departamentosPai ?? []} />
      </div>
    </div>
  );
}
