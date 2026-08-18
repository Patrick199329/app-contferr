import { notFound, redirect } from 'next/navigation';
import { ClienteForm } from '@/components/cliente-form';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import { linkClienteDepartamento, unlinkClienteDepartamento, updateCliente } from '../../actions';

type EditarClientePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditarClientePage({ params, searchParams }: EditarClientePageProps) {
  const profile = await getCurrentProfile();
  if (!podeGerenciarClientes(profile)) {
    redirect('/clientes');
  }

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single<Cliente>();

  if (!cliente) {
    notFound();
  }

  const [{ data: departamentos }, { data: vinculos }, { data: minhasPermissoes }] =
    await Promise.all([
      supabase.from('departamentos').select('id, nome').eq('status', 'ativo').order('ordem'),
      supabase.from('cliente_departamentos').select('departamento_id').eq('cliente_id', id),
      profile?.role === 'gerente'
        ? supabase.from('permissoes').select('departamento_id').eq('usuario_id', profile.id)
        : Promise.resolve({ data: null }),
    ]);

  const departamentosVinculados = new Set((vinculos ?? []).map((v) => v.departamento_id));
  const departamentosQueGerencio =
    profile?.role === 'admin'
      ? null // null = todos
      : new Set((minhasPermissoes ?? []).map((p) => p.departamento_id));

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 p-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Editar cliente</h1>
        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        <ClienteForm
          action={updateCliente.bind(null, id)}
          initialValues={{
            razaoSocial: cliente.razao_social,
            nomeFantasia: cliente.nome_fantasia,
            cnpj: cliente.cnpj,
          }}
          submitLabel="Salvar alterações"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Departamentos vinculados</h2>
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {(departamentos ?? []).map((dep) => {
            const vinculado = departamentosVinculados.has(dep.id);
            const podeAlterar =
              departamentosQueGerencio === null || departamentosQueGerencio.has(dep.id);
            return (
              <li key={dep.id} className="flex items-center justify-between py-2">
                <span>{dep.nome}</span>
                {podeAlterar ? (
                  <form
                    action={
                      vinculado
                        ? unlinkClienteDepartamento.bind(null, id, dep.id)
                        : linkClienteDepartamento.bind(null, id, dep.id)
                    }
                  >
                    <button type="submit" className="text-sm underline">
                      {vinculado ? 'Desvincular' : 'Vincular'}
                    </button>
                  </form>
                ) : (
                  <span className="text-sm text-black/50 dark:text-white/50">
                    {vinculado ? 'Vinculado' : 'Não vinculado'}
                  </span>
                )}
              </li>
            );
          })}
          {(departamentos ?? []).length === 0 ? (
            <li className="py-2 text-sm text-black/60 dark:text-white/60">
              Nenhum departamento cadastrado.
            </li>
          ) : null}
        </ul>
      </div>
    </main>
  );
}
