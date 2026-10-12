import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DepartamentoTabs } from '@/components/departamento-tabs';
import { QuadroTarefasList } from '@/components/quadro-tarefas-list';
import { ButtonLink } from '@/components/ui/button';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { getQuadroTarefasCampos } from '@/lib/supabase/quadro-tarefas-campos';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import type { QuadroTarefa } from '@/types/quadro-tarefa';

type QuadroTarefasPageProps = {
  searchParams: Promise<{ departamento?: string; todas?: string }>;
};

export default async function QuadroTarefasPage({ searchParams }: QuadroTarefasPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem')
    .returns<Departamento[]>();

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_quadro_tarefas');
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
        <h1 className="text-xl font-semibold">Tarefas Avulsas</h1>
        <p className="text-sm text-muted">
          {semDepartamentos
            ? 'Nenhum departamento cadastrado ainda.'
            : semFerramentaHabilitada
              ? 'Nenhum departamento tem Tarefas Avulsas habilitado. Habilite em Departamentos › Ferramentas habilitadas.'
              : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
        </p>
      </div>
    );
  }

  const { departamento: departamentoParam, todas } = await searchParams;
  const departamentoAtual =
    selecionaveis.find((d) => d.id === departamentoParam) ?? selecionaveis[0];
  const mostrarTodas = todas === '1';

  let query = supabase
    .from('quadro_tarefas')
    .select('*')
    .eq('departamento_id', departamentoAtual.id);

  // "Minhas tarefas" inclui as que eu sou responsável E as que eu criei pra
  // outra pessoa — senão, delegar uma tarefa fazia ela sumir da sua própria
  // visão, sem jeito de acompanhar se quem recebeu executou ou não.
  if (!mostrarTodas) {
    query = query.or(`responsavel_id.eq.${profile.id},criado_por.eq.${profile.id}`);
  }

  const { data: tarefas } = await query.returns<QuadroTarefa[]>();
  const { campos } = await getQuadroTarefasCampos(departamentoAtual.id);

  const clienteIds = [
    ...new Set((tarefas ?? []).map((t) => t.cliente_id).filter((id): id is string => !!id)),
  ];
  // Campos personalizados tipo "responsavel" podem referenciar pessoas que
  // não são responsável/criador de nenhuma tarefa — precisam entrar na
  // mesma busca pra resolver o nome na listagem.
  const camposResponsavelIds = new Set(
    campos.filter((c) => c.tipo === 'responsavel').map((c) => c.id),
  );
  const pessoaIds = [
    ...new Set(
      (tarefas ?? []).flatMap((t) => [
        t.responsavel_id,
        t.criado_por,
        ...Object.entries(t.valores ?? {})
          .filter(([campoId]) => camposResponsavelIds.has(campoId))
          .map(([, valor]) => valor),
      ]),
    ),
  ].filter((id): id is string => !!id);

  const [clientes, profiles] = await Promise.all([
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('clientes').select('id, nome_fantasia, google_drive_url').in('id', lote),
    ),
    selectEmLotes(pessoaIds, (lote) => supabase.from('profiles').select('id, nome, email').in('id', lote)),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Tarefas Avulsas</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DepartamentoTabs
            departamentos={departamentos}
            ativoId={departamentoAtual.id}
            basePath="/quadro-tarefas"
            extraQuery={mostrarTodas ? '&todas=1' : ''}
          />
          <ButtonLink href={`/quadro-tarefas/nova?departamento=${departamentoAtual.id}`}>
            Nova tarefa
          </ButtonLink>
        </div>
      </div>

      <Link
        href={`/quadro-tarefas?departamento=${departamentoAtual.id}${mostrarTodas ? '' : '&todas=1'}`}
        className="w-fit text-sm text-muted underline"
      >
        {mostrarTodas
          ? 'Ver só as minhas (criadas por mim ou atribuídas a mim)'
          : 'Ver todas as tarefas do departamento'}
      </Link>

      <QuadroTarefasList
        tarefas={tarefas ?? []}
        clientes={clientes ?? []}
        profiles={profiles ?? []}
        campos={campos}
      />
    </div>
  );
}
