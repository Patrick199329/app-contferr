import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ClienteForm } from '@/components/cliente-form';
import { caminhoInternoSeguro } from '@/lib/safe-redirect';
import {
  getDepartamentosPermitidos,
  getMembrosDoDepartamento,
  podeAcessarDepartamento,
  type MembroDepartamento,
} from '@/lib/supabase/permissoes';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { createCliente } from '../actions';

type NovoClientePageProps = {
  searchParams: Promise<{ voltar?: string }>;
};

export default async function NovoClientePage({ searchParams }: NovoClientePageProps) {
  const profile = await getCurrentProfile();
  if (!podeGerenciarClientes(profile)) {
    redirect('/clientes');
  }

  const { voltar } = await searchParams;
  const voltarSeguro = caminhoInternoSeguro(voltar);
  const supabase = await createClient();

  const [{ data: todosDepartamentos }, permitidos] = await Promise.all([
    supabase
      .from('departamentos')
      .select('id, nome, parent_id')
      .eq('status', 'ativo')
      .order('ordem'),
    getDepartamentosPermitidos(),
  ]);

  // Departamento que só agrupa subdepartamentos não tem colunas/tarefas
  // próprias, então não faz sentido oferecê-lo para vínculo.
  const paisComFilhos = new Set(
    (todosDepartamentos ?? []).filter((d) => d.parent_id).map((d) => d.parent_id as string),
  );

  // Permissão concedida no departamento pai também libera os filhos.
  const departamentosDisponiveis = (todosDepartamentos ?? [])
    .filter((d) => !paisComFilhos.has(d.id))
    .filter((d) => podeAcessarDepartamento(permitidos, d.id));

  const membrosPorDepartamentoEntries = await Promise.all(
    departamentosDisponiveis.map(
      async (dep) => [dep.id, await getMembrosDoDepartamento(dep.id)] as const,
    ),
  );
  const membrosPorDepartamento: Record<string, MembroDepartamento[]> = Object.fromEntries(
    membrosPorDepartamentoEntries,
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Clientes', href: '/clientes' }, { label: 'Novo cliente' }]} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Novo cliente</h1>
        {voltarSeguro ? (
          <Link href={voltarSeguro} className="text-sm text-muted hover:underline">
            ← Voltar
          </Link>
        ) : null}
      </div>
      <div className="app-card p-6">
        <ClienteForm
          action={createCliente.bind(null, voltarSeguro)}
          departamentosDisponiveis={departamentosDisponiveis}
          membrosPorDepartamento={membrosPorDepartamento}
          submitLabel="Criar cliente"
        />
      </div>
    </div>
  );
}
