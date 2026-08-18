import { redirect } from 'next/navigation';
import { UsuarioForm } from '@/components/usuario-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createUsuario } from '../actions';

export default async function NovoUsuarioPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/usuarios');
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Novo usuário</h1>
      <div className="app-card p-6">
        <UsuarioForm action={createUsuario} mode="create" submitLabel="Criar usuário" />
      </div>
    </div>
  );
}
