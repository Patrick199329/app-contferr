import { notFound, redirect } from 'next/navigation';
import { ColunaForm } from '@/components/coluna-form';
import { SimpleTextForm } from '@/components/simple-text-form';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { COLUNA_TIPO_LABELS, type Coluna, type Departamento } from '@/types/departamento';
import { createColuna, moveColuna, renameDepartamento, setColunaStatus } from '../actions';

type DepartamentoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DepartamentoPage({ params }: DepartamentoPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: departamento } = await supabase
    .from('departamentos')
    .select('*')
    .eq('id', id)
    .single<Departamento>();

  if (!departamento) {
    notFound();
  }

  const { data: colunas } = await supabase
    .from('colunas')
    .select('*')
    .eq('departamento_id', id)
    .order('status')
    .order('ordem')
    .returns<Coluna[]>();

  const colunasAtivas = (colunas ?? []).filter((c) => c.status === 'ativo');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{departamento.nome}</h1>
        <SimpleTextForm
          action={renameDepartamento.bind(null, id)}
          fieldName="nome"
          label="Renomear departamento"
          defaultValue={departamento.nome}
          submitLabel="Salvar nome"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Colunas</h2>
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {(colunas ?? []).map((coluna) => {
            const index = colunasAtivas.findIndex((c) => c.id === coluna.id);
            return (
              <li key={coluna.id} className="flex items-center justify-between py-2">
                <span>
                  {coluna.nome}{' '}
                  <span className="text-sm text-black/60 dark:text-white/60">
                    ({COLUNA_TIPO_LABELS[coluna.tipo]}
                    {coluna.status === 'inativo' ? ', inativa' : ''})
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  {coluna.status === 'ativo' ? (
                    <>
                      <form action={moveColuna.bind(null, id, coluna.id, 'up')}>
                        <button
                          type="submit"
                          disabled={index <= 0}
                          className="text-sm underline disabled:opacity-30"
                        >
                          Subir
                        </button>
                      </form>
                      <form action={moveColuna.bind(null, id, coluna.id, 'down')}>
                        <button
                          type="submit"
                          disabled={index === -1 || index >= colunasAtivas.length - 1}
                          className="text-sm underline disabled:opacity-30"
                        >
                          Descer
                        </button>
                      </form>
                    </>
                  ) : null}
                  <form
                    action={setColunaStatus.bind(
                      null,
                      id,
                      coluna.id,
                      coluna.status === 'ativo' ? 'inativo' : 'ativo',
                    )}
                  >
                    <button type="submit" className="text-sm underline">
                      {coluna.status === 'ativo' ? 'Desativar' : 'Reativar'}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
          {(colunas ?? []).length === 0 ? (
            <li className="py-2 text-sm text-black/60 dark:text-white/60">
              Nenhuma coluna cadastrada.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Nova coluna</h2>
        <ColunaForm action={createColuna.bind(null, id)} />
      </div>
    </main>
  );
}
