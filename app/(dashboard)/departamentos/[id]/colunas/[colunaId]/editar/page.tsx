import { notFound, redirect } from 'next/navigation';
import { updateColuna } from '@/app/(dashboard)/departamentos/actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ColunaForm } from '@/components/coluna-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Coluna, Departamento } from '@/types/departamento';

type EditarColunaPageProps = {
  params: Promise<{ id: string; colunaId: string }>;
};

export default async function EditarColunaPage({ params }: EditarColunaPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id, colunaId } = await params;
  const supabase = await createClient();

  const [{ data: departamento }, { data: coluna }] = await Promise.all([
    supabase
      .from('departamentos')
      .select('id, nome, usa_funcionarios, usa_corresponsavel')
      .eq('id', id)
      .single<Departamento>(),
    supabase.from('colunas').select('*').eq('id', colunaId).single<Coluna>(),
  ]);

  if (!departamento || !coluna) notFound();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Departamentos', href: '/departamentos' },
          { label: departamento.nome, href: `/departamentos/${id}` },
          { label: `Editar coluna — ${coluna.nome}` },
        ]}
      />
      <h1 className="text-xl font-semibold">Editar coluna</h1>
      <div className="app-card p-6">
        <ColunaForm
          action={updateColuna.bind(null, id, colunaId)}
          usaFuncionarios={departamento.usa_funcionarios}
          usaCorresponsavel={departamento.usa_corresponsavel}
          initialValues={{
            nome: coluna.nome,
            tipo: coluna.tipo,
            periodicidade: coluna.periodicidade,
            mesesAplicaveis: coluna.meses_aplicaveis,
            campoClienteAlvo: coluna.campo_cliente_alvo,
            linkIcone: coluna.link_icone,
            linkUrl: coluna.link_url,
            manterValorAnterior: coluna.manter_valor_anterior,
            ehCorresponsavel: coluna.eh_corresponsavel,
          }}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
