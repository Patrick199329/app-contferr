import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Painel Administrativo</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Em construção — chega na Fase 3 do backlog (departamentos, colunas, usuários e permissões).
      </p>
    </main>
  );
}
