import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DepartamentoTabs } from '@/components/departamento-tabs';
import { ResponsavelFiltroSelect } from '@/components/responsavel-filtro-select';
import { TarefasTable } from '@/components/tarefas-table';
import { currentCompetencia, formatCompetencia, shiftCompetencia } from '@/lib/competencia';
import { colunaAplicavelNoMes } from '@/lib/colunas-periodicidade';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getConfiguracoesSistema } from '@/lib/supabase/configuracoes-sistema';
import {
  getDepartamentosPermitidos,
  getMembrosDoDepartamento,
  getResponsavelPadraoPorCliente,
  podeAcessarDepartamento,
} from '@/lib/supabase/permissoes';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import type { Coluna, Departamento, OpcaoColuna } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';

type TarefasPageProps = {
  searchParams: Promise<{
    departamento?: string;
    todas?: string;
    competencia?: string;
    responsavel?: string;
    visao?: string;
  }>;
};

export default async function TarefasPage({ searchParams }: TarefasPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .order('ordem')
    .returns<Departamento[]>();

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_tarefas_padrao');
  const permitidos = await getDepartamentosPermitidos();
  const departamentos = comFerramenta.filter((d) => podeAcessarDepartamento(permitidos, d.id));

  // Departamentos que só agrupam subdepartamentos não têm colunas/tarefas
  // próprias — nunca podem virar a aba selecionada (só aparecem como dropdown).
  const paisComFilhos = new Set(
    departamentos.filter((d) => d.parent_id).map((d) => d.parent_id as string),
  );
  const selecionaveis = departamentos.filter((d) => !paisComFilhos.has(d.id));

  if (selecionaveis.length === 0) {
    const semDepartamentos = (todosDepartamentos ?? []).length === 0;
    const semFerramentaHabilitada = !semDepartamentos && comFerramenta.length === 0;
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Tabela de Tarefas</h1>
        <p className="text-sm text-muted">
          {semDepartamentos
            ? 'Nenhum departamento cadastrado ainda.'
            : semFerramentaHabilitada
              ? 'Nenhum departamento tem a Tabela de Tarefas habilitada. Habilite em Departamentos › Ferramentas habilitadas.'
              : 'Você ainda não tem acesso a nenhum departamento. Fale com o Administrador.'}
          {profile.role === 'admin' && semDepartamentos ? (
            <>
              {' '}
              <Link href="/departamentos/novo" className="underline">
                Criar o primeiro departamento
              </Link>
              .
            </>
          ) : null}
        </p>
      </div>
    );
  }

  const {
    departamento: departamentoParam,
    todas,
    competencia: competenciaParam,
    responsavel: responsavelParam,
    visao: visaoParam,
  } = await searchParams;
  const departamentoAtual =
    selecionaveis.find((d) => d.id === departamentoParam) ?? selecionaveis[0];
  const mostrarTodos = todas === '1';

  // Padrão: mês corrente. Janela de edição pra meses anteriores é
  // configurável pelo admin (Painel Administrativo > Configurações) — meses
  // fora dela seguem só no Histórico, que continua sem limite.
  const { tarefas_meses_edicao_retroativa: mesesRetroativos } = await getConfiguracoesSistema();
  const competenciaAtual = currentCompetencia();
  const competenciaMinima = shiftCompetencia(competenciaAtual, -mesesRetroativos);
  const competencia =
    competenciaParam && competenciaParam >= competenciaMinima && competenciaParam <= competenciaAtual
      ? competenciaParam
      : competenciaAtual;
  const podeVoltar = competencia > competenciaMinima;
  const podeAvancar = competencia < competenciaAtual;

  const { data: vinculos } = await supabase
    .from('cliente_departamentos')
    .select('cliente_id')
    .eq('departamento_id', departamentoAtual.id);
  const clienteIdsDoDepartamento = (vinculos ?? []).map((v) => v.cliente_id);

  const [
    { data: colunas },
    clientes,
    { data: tarefas },
    { data: profiles },
    membrosDoDepartamento,
    responsavelPadraoPorClienteFallback,
  ] = await Promise.all([
    supabase
      .from('colunas')
      .select('*')
      .eq('departamento_id', departamentoAtual.id)
      .eq('status', 'ativo')
      .order('ordem')
      .returns<Coluna[]>(),
    selectEmLotes(clienteIdsDoDepartamento, (lote) =>
      supabase.from('clientes').select('*').in('id', lote).eq('status', 'ativo').returns<Cliente[]>(),
    ),
    supabase
      .from('tarefas')
      .select('*')
      .eq('departamento_id', departamentoAtual.id)
      .eq('competencia', competencia)
      .returns<Tarefa[]>(),
    supabase.from('profiles').select('id, email, nome, status').order('nome'),
    getMembrosDoDepartamento(departamentoAtual.id),
    getResponsavelPadraoPorCliente(departamentoAtual.id),
  ]);
  clientes.sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia));

  const colunasDoMes = (colunas ?? []).filter((c) => colunaAplicavelNoMes(c, competencia));

  const colunasComOpcoes = colunasDoMes.filter(
    (c) => c.tipo === 'lista_opcoes' || c.tipo === 'status',
  );
  const opcoesPorColuna: Record<string, string[]> = {};
  if (colunasComOpcoes.length > 0) {
    const { data: opcoes } = await supabase
      .from('opcoes_coluna')
      .select('*')
      .in(
        'coluna_id',
        colunasComOpcoes.map((c) => c.id),
      )
      .eq('status', 'ativo')
      .order('ordem')
      .returns<OpcaoColuna[]>();

    for (const opcao of opcoes ?? []) {
      opcoesPorColuna[opcao.coluna_id] = [...(opcoesPorColuna[opcao.coluna_id] ?? []), opcao.valor];
    }
  }

  const tarefasPorCliente: Record<string, Tarefa> = {};
  for (const tarefa of tarefas ?? []) {
    tarefasPorCliente[tarefa.cliente_id] = tarefa;
  }

  // Vale o valor da linha do mês se ela já existe, senão o padrão do cadastro.
  function responsavelEfetivo(clienteId: string): string | null {
    const tarefa = tarefasPorCliente[clienteId];
    return tarefa ? tarefa.responsavel_padrao_id : (responsavelPadraoPorClienteFallback[clienteId] ?? null);
  }

  // Só aceita filtrar por alguém que realmente está nesse departamento —
  // um id inválido/de fora cai pro padrão em vez de mostrar lista vazia.
  const responsavelFiltroId = membrosDoDepartamento.some((m) => m.id === responsavelParam)
    ? (responsavelParam as string)
    : null;
  const nomeResponsavelFiltro = responsavelFiltroId
    ? (membrosDoDepartamento.find((m) => m.id === responsavelFiltroId)?.nome ?? '')
    : null;
  const colunasCorresponsavel = colunasDoMes.filter((c) => c.eh_corresponsavel);
  const visaoCorresponsavel = visaoParam === 'corresponsavel' && colunasCorresponsavel.length > 0;
  const queryFiltro = visaoCorresponsavel
    ? '&visao=corresponsavel'
    : responsavelFiltroId
      ? `&responsavel=${responsavelFiltroId}`
      : mostrarTodos
        ? '&todas=1'
        : '';

  // Quem esse cliente/funcionário precisa "pertencer" pra aparecer, quando
  // nem "todos" nem um responsável específico foram escolhidos: o próprio
  // usuário logado, mais os sem responsável (pra nada ficar escondido por
  // falta de dono). Ao escolher um responsável específico no filtro, vale
  // só aquele responsável — sem misturar com os sem responsável, já que a
  // ideia ali é ver a lista de uma pessoa específica (cobrir alguém, revisar
  // o trabalho de alguém), não "o que está sobrando".
  const profileId = profile.id;
  function pertenceAoFiltro(resp: string | null): boolean {
    if (mostrarTodos) return true;
    if (responsavelFiltroId) return resp === responsavelFiltroId;
    return resp === null || resp === profileId;
  }

  function ehCorresponsavelDoUsuario(clienteId: string): boolean {
    const valores = tarefasPorCliente[clienteId]?.valores;
    return colunasCorresponsavel.some((c) => valores?.[c.id] === profileId);
  }

  const clientesExibidos = (clientes ?? []).filter((c) =>
    visaoCorresponsavel ? ehCorresponsavelDoUsuario(c.id) : pertenceAoFiltro(responsavelEfetivo(c.id)),
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Tabela de Tarefas — {formatCompetencia(competencia)}
        </h1>
        <DepartamentoTabs
          departamentos={departamentos}
          ativoId={departamentoAtual.id}
          basePath="/tarefas"
          extraQuery={`&competencia=${competencia}${queryFiltro}`}
        />
      </div>

      {mesesRetroativos > 0 ? (
        <div className="flex items-center gap-4 text-sm">
          {podeVoltar ? (
            <Link
              href={`/tarefas?departamento=${departamentoAtual.id}&competencia=${shiftCompetencia(competencia, -1)}${queryFiltro}`}
              className="text-muted hover:underline"
            >
              ← Mês anterior
            </Link>
          ) : (
            <Link href="/historico" className="text-muted hover:underline">
              Ver mais meses no Histórico
            </Link>
          )}
          {podeAvancar ? (
            <Link
              href={`/tarefas?departamento=${departamentoAtual.id}&competencia=${shiftCompetencia(competencia, 1)}${queryFiltro}`}
              className="text-muted hover:underline"
            >
              Mês seguinte →
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p className="text-muted">
          {visaoCorresponsavel
            ? 'Mostrando só os clientes em que você é corresponsável.'
            : mostrarTodos
              ? 'Mostrando todos os clientes do departamento.'
              : responsavelFiltroId
                ? `Mostrando os clientes de ${nomeResponsavelFiltro}.`
                : 'Mostrando só os clientes sob sua responsabilidade e os sem responsável definido.'}
        </p>
        {colunasCorresponsavel.length > 0 ? (
          <div className="flex gap-1.5">
            {[
              {
                href: `/tarefas?departamento=${departamentoAtual.id}&competencia=${competencia}`,
                label: 'Minha carteira',
                ativo: !visaoCorresponsavel,
              },
              {
                href: `/tarefas?departamento=${departamentoAtual.id}&competencia=${competencia}&visao=corresponsavel`,
                label: 'Sou corresponsável',
                ativo: visaoCorresponsavel,
              },
            ].map((op) => (
              <Link
                key={op.label}
                href={op.href}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  op.ativo
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-surface-muted text-foreground/70 hover:bg-surface-muted/70'
                }`}
              >
                {op.label}
              </Link>
            ))}
          </div>
        ) : null}
        {visaoCorresponsavel ? null : (
          <ResponsavelFiltroSelect
            basePath="/tarefas"
            departamentoId={departamentoAtual.id}
            membros={membrosDoDepartamento}
            mostrarTodos={mostrarTodos}
            responsavelFiltroId={responsavelFiltroId}
          />
        )}
      </div>

      {colunasDoMes.length === 0 ? (
        <p className="text-sm text-muted">
          {(colunas ?? []).length === 0
            ? 'Este departamento ainda não tem colunas configuradas.'
            : 'Nenhuma coluna configurada aparece nesta competência (todas são trimestrais/semestrais/anuais de outros meses).'}
          {profile.role === 'admin' ? (
            <>
              {' '}
              <Link href={`/departamentos/${departamentoAtual.id}`} className="underline">
                Configurar colunas
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : (
        <TarefasTable
          clientes={clientesExibidos}
          colunas={colunasDoMes}
          opcoesPorColuna={opcoesPorColuna}
          tarefasPorCliente={tarefasPorCliente}
          profiles={profiles ?? []}
          departamentoId={departamentoAtual.id}
          competencia={competencia}
          currentUserName={profile.nome || profile.email}
          membrosDoDepartamento={membrosDoDepartamento}
          responsavelPadraoPorClienteFallback={responsavelPadraoPorClienteFallback}
          podeEditarResponsavelPadrao={podeGerenciarClientes(profile)}
        />
      )}
    </div>
  );
}
