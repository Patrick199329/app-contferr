import Link from 'next/link';
import { logout } from '@/app/(auth)/login/actions';
import { getCurrentProfile } from '@/lib/supabase/profile';

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Logado como {profile?.email} ({profile?.role})
      </p>
      <Link href="/clientes" className="text-sm underline">
        Clientes
      </Link>
      <Link href="/tarefas" className="text-sm underline">
        Tabela de Tarefas
      </Link>
      {profile?.role === 'admin' ? (
        <>
          <Link href="/departamentos" className="text-sm underline">
            Departamentos
          </Link>
          <Link href="/admin" className="text-sm underline">
            Painel Administrativo
          </Link>
        </>
      ) : null}
      <form action={logout}>
        <button
          type="submit"
          className="rounded border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
