import { redirect } from 'next/navigation';
import { ClienteForm } from '@/components/cliente-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createCliente } from '../actions';

export default async function NovoClientePage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/clientes');
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Novo cliente</h1>
      <ClienteForm action={createCliente} submitLabel="Criar cliente" />
    </main>
  );
}
