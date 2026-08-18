import Link from 'next/link';
import { redirect } from 'next/navigation';
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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuários</h1>
        <Link
          href="/usuarios/novo"
          className="rounded bg-foreground px-4 py-2 text-sm text-background"
        >
          Novo usuário
        </Link>
      </div>

      {erro ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      ) : null}

      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {(usuarios ?? []).map((u) => (
          <li key={u.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">
                {u.nome || u.email}
                {u.status === 'inativo' ? ' (inativo)' : ''}
              </p>
              <p className="text-sm text-black/60 dark:text-white/60">
                {u.email} —{' '}
                {u.role === 'admin'
                  ? 'Administrador'
                  : u.role === 'gerente'
                    ? 'Gerente'
                    : 'Usuário Final'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href={`/usuarios/${u.id}/editar`} className="text-sm underline">
                Editar
              </Link>
              {u.role !== 'admin' ? (
                <Link href={`/usuarios/${u.id}/permissoes`} className="text-sm underline">
                  Permissões
                </Link>
              ) : null}
              <form
                action={async () => {
                  'use server';
                  await setUsuarioStatus(u.id, u.status === 'ativo' ? 'inativo' : 'ativo');
                }}
              >
                <button type="submit" className="text-sm underline">
                  {u.status === 'ativo' ? 'Desativar' : 'Reativar'}
                </button>
              </form>
            </div>
          </li>
        ))}
        {(usuarios ?? []).length === 0 ? (
          <li className="py-3 text-sm text-black/60 dark:text-white/60">
            Nenhum usuário cadastrado.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
