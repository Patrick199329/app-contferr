import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { getCurrentProfile, type Profile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { setUsuarioStatus } from './actions';

type UsuariosPageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const { erro } = await searchParams;

  const supabase = await createClient();
  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, email, nome, role, status')
    .order('nome')
    .returns<Profile[]>();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuários</h1>
        <ButtonLink href="/usuarios/novo">Novo usuário</ButtonLink>
      </div>

      {erro ? (
        <p className="rounded-2xl bg-status-inactive/10 p-4 text-sm text-status-inactive">{erro}</p>
      ) : null}

      <ul className="app-card flex flex-col divide-y divide-border">
        {(usuarios ?? []).map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">
                {u.nome || u.email}
                {u.status === 'inativo' ? <Badge tone="inactive"> inativo</Badge> : null}
              </p>
              <p className="text-sm text-muted">
                {u.email} —{' '}
                {u.role === 'admin'
                  ? 'Administrador'
                  : u.role === 'gerente'
                    ? 'Gerente'
                    : 'Usuário Final'}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link
                href={`/usuarios/${u.id}/editar`}
                className="text-sm text-muted hover:underline"
              >
                Editar
              </Link>
              {u.role !== 'admin' ? (
                <Link
                  href={`/usuarios/${u.id}/permissoes`}
                  className="text-sm text-muted hover:underline"
                >
                  Permissões
                </Link>
              ) : null}
              <form
                action={async () => {
                  'use server';
                  await setUsuarioStatus(u.id, u.status === 'ativo' ? 'inativo' : 'ativo');
                }}
              >
                <button type="submit" className="text-sm text-muted hover:underline">
                  {u.status === 'ativo' ? 'Desativar' : 'Reativar'}
                </button>
              </form>
            </div>
          </li>
        ))}
        {(usuarios ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum usuário cadastrado.</li>
        ) : null}
      </ul>
    </div>
  );
}
