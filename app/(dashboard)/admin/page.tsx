import Link from 'next/link';
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
      <div className="flex flex-col items-center gap-2">
        <Link href="/departamentos" className="text-sm underline">
          Departamentos e colunas
        </Link>
        <Link href="/usuarios" className="text-sm underline">
          Usuários e permissões
        </Link>
        <Link href="/admin/virada" className="text-sm underline">
          Virada Mensal
        </Link>
      </div>
    </main>
  );
}
