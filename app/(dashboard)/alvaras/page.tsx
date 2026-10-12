import { redirect } from 'next/navigation';
import { DepartamentoTabs } from '@/components/departamento-tabs';
import { LicencasList } from '@/components/licencas-list';
import { ButtonLink } from '@/components/ui/button';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import type { Licenca } from '@/types/licenca';

type AlvarasPageProps = {
  searchParams: Promise<{ departamento?: string }>;
};

export default async function AlvarasPage({ searchParams }: AlvarasPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem')
    .returns<Departamento[]>();

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_alvaras');
  const permitidos = await getDepartamentosPermitidos();
  const departamentos = comFerramenta.filter((d) => podeAcessarDepartamento(permitidos, d.id));

  const paisComFilhos = new Set(
    departamentos.filter((d) => d.parent_id).map((d) => d.parent_id as string),
  );
  const selecionaveis = departamentos.filter((d) => !paisComFilhos.has(d.id));

  if (selecionaveis.length === 0) {
    const semDepartamentos = (todosDepartamentos ?? []).length === 0;
    const semFerramentaHabilitada = !semDepartamentos && comFerramenta.length === 0;
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Alvarás e licenças</h1>
        <p className="text-sm text-muted">
          {semDepartamentos
            ? 'Nenhum departamento cadastrado ainda.'
            : semFerramentaHabilitada
              ? 'Nenhum departamento tem Alvarás e licenças habilitado. Habilite em Departamentos › Ferramentas habilitadas.'
              : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam } = await searchParams;
  const departamentoAtual =
    selecionaveis.find((d) => d.id === departamentoParam) ?? selecionaveis[0];

  const { data: licencas } = await supabase
    .from('licencas')
    .select('*')
    .eq('departamento_id', departamentoAtual.id)
    .order('data_vencimento', { ascending: true, nullsFirst: false })
    .returns<Licenca[]>();

  const clienteIds = [...new Set((licencas ?? []).map((l) => l.cliente_id))];
  const clientes = await selectEmLotes(clienteIds, (lote) =>
    supabase.from('clientes').select('id, nome_fantasia, cnpj, google_drive_url').in('id', lote),
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Alvarás e licenças</h1>
          <p className="text-sm text-muted">
            Centralize vigências, órgãos emissores e valores recorrentes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DepartamentoTabs
            departamentos={departamentos}
            ativoId={departamentoAtual.id}
            basePath="/alvaras"
          />
          <ButtonLink href={`/alvaras/nova?departamento=${departamentoAtual.id}`}>
            Nova licença
          </ButtonLink>
        </div>
      </div>

      <LicencasList licencas={licencas ?? []} clientes={clientes ?? []} />
    </div>
  );
}
