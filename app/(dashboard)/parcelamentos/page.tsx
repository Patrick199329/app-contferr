import { redirect } from 'next/navigation';
import { DepartamentoTabs } from '@/components/departamento-tabs';
import { ParcelamentosList } from '@/components/parcelamentos-list';
import { ButtonLink } from '@/components/ui/button';
import { currentCompetencia } from '@/lib/competencia';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import type { Parcelamento, ParcelamentoParcela } from '@/types/parcelamento';

type ParcelamentosPageProps = {
  searchParams: Promise<{ departamento?: string; competencia?: string }>;
};

export default async function ParcelamentosPage({ searchParams }: ParcelamentosPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem')
    .returns<Departamento[]>();

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_parcelamentos');
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
        <h1 className="text-xl font-semibold">Parcelamentos</h1>
        <p className="text-sm text-muted">
          {semDepartamentos
            ? 'Nenhum departamento cadastrado ainda.'
            : semFerramentaHabilitada
              ? 'Nenhum departamento tem Parcelamentos habilitado. Habilite em Departamentos › Ferramentas habilitadas.'
              : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam, competencia: competenciaParam } = await searchParams;
  const departamentoAtual =
    selecionaveis.find((d) => d.id === departamentoParam) ?? selecionaveis[0];

  const competenciaHoje = currentCompetencia();
  const competenciaAtual = competenciaParam ?? competenciaHoje;

  const { data: parcelamentos } = await supabase
    .from('parcelamentos')
    .select('*')
    .eq('departamento_id', departamentoAtual.id)
    .returns<Parcelamento[]>();

  const parcelamentoIds = (parcelamentos ?? []).map((p) => p.id);
  const { data: parcelas } =
    parcelamentoIds.length > 0
      ? await supabase
          .from('parcelamento_parcelas')
          .select('*')
          .in('parcelamento_id', parcelamentoIds)
          .lte('competencia', competenciaAtual)
          .returns<ParcelamentoParcela[]>()
      : { data: [] as ParcelamentoParcela[] };

  const clienteIds = [...new Set((parcelamentos ?? []).map((p) => p.cliente_id))];
  const pessoaIds = [
    ...new Set((parcelamentos ?? []).map((p) => p.responsavel_id).filter((id): id is string => !!id)),
  ];

  const [clientes, profiles] = await Promise.all([
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('clientes').select('id, nome_fantasia, cnpj, codigo, google_drive_url').in('id', lote),
    ),
    selectEmLotes(pessoaIds, (lote) => supabase.from('profiles').select('id, nome, email').in('id', lote)),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Parcelamentos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DepartamentoTabs
            departamentos={departamentos}
            ativoId={departamentoAtual.id}
            basePath="/parcelamentos"
            extraQuery={`&competencia=${competenciaAtual}`}
          />
          <ButtonLink href={`/parcelamentos/novo?departamento=${departamentoAtual.id}`}>
            Novo parcelamento
          </ButtonLink>
        </div>
      </div>

      <ParcelamentosList
        parcelamentos={parcelamentos ?? []}
        parcelas={parcelas ?? []}
        clientes={clientes ?? []}
        profiles={profiles ?? []}
        competenciaAtual={competenciaAtual}
        competenciaHoje={competenciaHoje}
        departamentoId={departamentoAtual.id}
      />
    </div>
  );
}
