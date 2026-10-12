import { notFound, redirect } from 'next/navigation';
import { updateTipoProcesso } from '@/app/(dashboard)/departamentos/actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { TipoProcessoForm } from '@/components/tipo-processo-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { TipoProcesso } from '@/types/processo';

type EditarTipoProcessoPageProps = {
  params: Promise<{ id: string; tipoId: string }>;
};

export default async function EditarTipoProcessoPage({ params }: EditarTipoProcessoPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id, tipoId } = await params;
  const supabase = await createClient();

  const [{ data: departamento }, { data: tipoProcesso }] = await Promise.all([
    supabase.from('departamentos').select('id, nome').eq('id', id).single(),
    supabase.from('tipos_processo').select('*').eq('id', tipoId).single<TipoProcesso>(),
  ]);

  if (!departamento || !tipoProcesso) notFound();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Departamentos', href: '/departamentos' },
          { label: departamento.nome, href: `/departamentos/${id}` },
          { label: `Editar tipo de serviço — ${tipoProcesso.nome}` },
        ]}
      />
      <h1 className="text-xl font-semibold">Editar tipo de serviço</h1>
      <div className="app-card p-6">
        <TipoProcessoForm
          action={updateTipoProcesso.bind(null, id, tipoId)}
          initialValues={{
            nome: tipoProcesso.nome,
            codigo: tipoProcesso.codigo,
            cor: tipoProcesso.cor,
          }}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
