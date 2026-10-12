import { notFound, redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { EditarEmailForm } from '@/components/editar-email-form';
import { RedefinirSenhaForm } from '@/components/redefinir-senha-form';
import { UsuarioForm } from '@/components/usuario-form';
import { getCurrentProfile, type Profile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import { resetUsuarioSenha, updateUsuario, updateUsuarioEmail } from '../../actions';

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

  const [{ data: departamentos }, { data: permissoes }] = await Promise.all([
    supabase
      .from('departamentos')
      .select('*')
      .eq('status', 'ativo')
      .order('ordem')
      .returns<Departamento[]>(),
    supabase.from('permissoes').select('departamento_id').eq('usuario_id', id),
  ]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Usuários', href: '/usuarios' },
          { label: `Editar — ${usuario.nome || usuario.email}` },
        ]}
      />
      <h1 className="text-xl font-semibold">Editar usuário</h1>
      <div className="app-card p-6">
        <UsuarioForm
          action={updateUsuario.bind(null, id)}
          mode="edit"
          initialValues={{
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            departamentoIds: (permissoes ?? []).map((p) => p.departamento_id),
          }}
          departamentos={departamentos ?? []}
          submitLabel="Salvar alterações"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">E-mail de login</h2>
        <p className="text-sm text-muted">
          Corrige erro de digitação no cadastro. O usuário passa a entrar com o novo e-mail.
        </p>
        <div className="app-card p-6">
          <EditarEmailForm action={updateUsuarioEmail.bind(null, id)} emailAtual={usuario.email} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Redefinir senha</h2>
        <p className="text-sm text-muted">
          Use quando o usuário esquecer a senha ou tiver dificuldade pra entrar. A nova senha vale
          imediatamente.
        </p>
        <div className="app-card p-6">
          <RedefinirSenhaForm action={resetUsuarioSenha.bind(null, id)} />
        </div>
      </div>
    </div>
  );
}
