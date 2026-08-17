import { notFound, redirect } from 'next/navigation';
import { UsuarioForm } from '@/components/usuario-form';
import { getCurrentProfile, type Profile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { updateUsuario } from '../../actions';

type EditarUsuarioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarUsuarioPage({ params }: EditarUsuarioPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/usuarios');
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: usuario } = await supabase
    .from('profiles')
    .select('id, email, nome, role, status')
    .eq('id', id)
    .single<Profile>();

  if (!usuario) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Editar usuário</h1>
      <UsuarioForm
        action={updateUsuario.bind(null, id)}
        mode="edit"
        initialValues={{ nome: usuario.nome, email: usuario.email, role: usuario.role }}
        submitLabel="Salvar alterações"
      />
    </main>
  );
}
