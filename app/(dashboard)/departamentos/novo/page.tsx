import { redirect } from 'next/navigation';
import { SimpleTextForm } from '@/components/simple-text-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createDepartamento } from '../actions';

export default async function NovoDepartamentoPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Novo departamento</h1>
      <SimpleTextForm
        action={createDepartamento}
        fieldName="nome"
        label="Nome do departamento"
        submitLabel="Criar departamento"
      />
    </main>
  );
}
