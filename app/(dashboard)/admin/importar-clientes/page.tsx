import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ImportarClientesForm } from '@/components/importar-clientes-form';
import { getCurrentProfile } from '@/lib/supabase/profile';

export default async function ImportarClientesPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        items={[{ label: 'Painel Administrativo', href: '/admin' }, { label: 'Importar clientes' }]}
      />
      <div>
        <h1 className="text-xl font-semibold">Importar clientes</h1>
        <p className="text-sm text-muted">
          Envie uma planilha .xlsx pra cadastrar vários clientes de uma vez. Antes de gravar
          qualquer coisa, mostramos uma prévia com o que vai entrar e o que será ignorado (e por
          quê) pra você conferir.
        </p>
      </div>
      <a
        href="/admin/importar-clientes/modelo"
        className="w-fit text-sm text-muted underline"
      >
        Baixar modelo de planilha
      </a>
      <div className="app-card p-6">
        <ImportarClientesForm />
      </div>
    </div>
  );
}
