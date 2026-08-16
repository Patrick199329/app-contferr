import { notFound, redirect } from 'next/navigation';
import { ClienteForm } from '@/components/cliente-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import { updateCliente } from '../../actions';

type EditarClientePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarClientePage({ params }: EditarClientePageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/clientes');
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single<Cliente>();

  if (!cliente) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Editar cliente</h1>
      <ClienteForm
        action={updateCliente.bind(null, id)}
        initialValues={{
          razaoSocial: cliente.razao_social,
          nomeFantasia: cliente.nome_fantasia,
          cnpj: cliente.cnpj,
        }}
        submitLabel="Salvar alterações"
      />
    </main>
  );
}
