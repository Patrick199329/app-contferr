import { notFound, redirect } from 'next/navigation';
import { updateQuadroCampo } from '@/app/(dashboard)/departamentos/actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { QuadroCampoForm } from '@/components/quadro-campo-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import type { QuadroTarefaCampo } from '@/types/quadro-tarefa';

type EditarQuadroCampoPageProps = {
  params: Promise<{ id: string; campoId: string }>;
};

export default async function EditarQuadroCampoPage({ params }: EditarQuadroCampoPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id, campoId } = await params;
  const supabase = await createClient();

  const [{ data: departamento }, { data: campo }] = await Promise.all([
    supabase.from('departamentos').select('id, nome').eq('id', id).single<Departamento>(),
    supabase
      .from('quadro_tarefas_campos')
      .select('*')
      .eq('id', campoId)
      .single<QuadroTarefaCampo>(),
  ]);

  if (!departamento || !campo) notFound();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Departamentos', href: '/departamentos' },
          { label: departamento.nome, href: `/departamentos/${id}` },
          { label: `Editar campo — ${campo.nome}` },
        ]}
      />
      <h1 className="text-xl font-semibold">Editar campo</h1>
      <div className="app-card p-6">
        <QuadroCampoForm
          action={updateQuadroCampo.bind(null, id, campoId)}
          initialValues={{ nome: campo.nome, tipo: campo.tipo }}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
