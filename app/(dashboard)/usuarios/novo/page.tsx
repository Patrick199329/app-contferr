import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { UsuarioForm } from '@/components/usuario-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import { createUsuario } from '../actions';

export default async function NovoUsuarioPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/usuarios');
  }

  const supabase = await createClient();
  const { data: departamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem')
    .returns<Departamento[]>();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Usuários', href: '/usuarios' }, { label: 'Novo usuário' }]} />
      <h1 className="text-xl font-semibold">Novo usuário</h1>
      <div className="app-card p-6">
        <UsuarioForm
          action={createUsuario}
          mode="create"
          departamentos={departamentos ?? []}
          submitLabel="Criar usuário"
        />
      </div>
    </div>
  );
}
