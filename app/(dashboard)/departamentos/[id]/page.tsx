import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ColunaForm } from '@/components/coluna-form';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { FerramentasDepartamentoForm } from '@/components/ferramentas-departamento-form';
import { QuadroCampoForm } from '@/components/quadro-campo-form';
import { SimpleTextForm } from '@/components/simple-text-form';
import { TipoProcessoForm } from '@/components/tipo-processo-form';
import { Badge } from '@/components/ui/badge';
import { NOMES_MESES } from '@/lib/competencia';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import {
  COLUNA_PERIODICIDADE_LABELS,
  COLUNA_TIPOS_COM_OPCOES,
  COLUNA_TIPO_LABELS,
  type Coluna,
  type Departamento,
} from '@/types/departamento';
import type { QuadroTarefaCampo } from '@/types/quadro-tarefa';
import type { TipoProcesso } from '@/types/processo';
import {
  createColuna,
  createQuadroCampo,
  createTipoProcesso,
  deleteColuna,
  deleteQuadroCampo,
  deleteTipoProcesso,
  moveColuna,
  moveQuadroCampo,
  moveTipoProcesso,
  renameDepartamento,
  setColunaStatus,
  setQuadroCampoStatus,
  setTipoProcessoStatus,
  updateDepartamentoFerramentas,
} from '../actions';

type DepartamentoPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function DepartamentoPage({ params, searchParams }: DepartamentoPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/departamentos');
  }

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: departamento } = await supabase
    .from('departamentos')
    .select('*')
    .eq('id', id)
    .single<Departamento>();

  if (!departamento) {
    notFound();
  }

  const [{ data: pai }, { data: filhos }] = await Promise.all([
    departamento.parent_id
      ? supabase
          .from('departamentos')
          .select('id, nome')
          .eq('id', departamento.parent_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase.from('departamentos').select('id, nome').eq('parent_id', id).order('nome'),
  ]);

  const { data: colunas } = await supabase
    .from('colunas')
    .select('*')
    .eq('departamento_id', id)
    .order('status')
    .order('ordem')
    .returns<Coluna[]>();

  const colunasAtivas = (colunas ?? []).filter((c) => c.status === 'ativo');

  // Só pode excluir de verdade colunas que nunca receberam valor gravado em
  // nenhuma tarefa — senão é só desativar, pra não perder histórico.
  const { data: tarefasDoDepartamento } = await supabase
    .from('tarefas')
    .select('valores')
    .eq('departamento_id', id);
  const colunasComMovimentacao = new Set(
    (tarefasDoDepartamento ?? []).flatMap((t) => Object.keys(t.valores ?? {})),
  );

  const { data: quadroCampos } = await supabase
    .from('quadro_tarefas_campos')
    .select('*')
    .eq('departamento_id', id)
    .order('status')
    .order('ordem')
    .returns<QuadroTarefaCampo[]>();

  const quadroCamposAtivos = (quadroCampos ?? []).filter((c) => c.status === 'ativo');

  // Mesma lógica de colunasComMovimentacao, aplicada às tarefas do Quadro.
  const { data: quadroTarefasDoDepartamento } = await supabase
    .from('quadro_tarefas')
    .select('valores')
    .eq('departamento_id', id);
  const quadroCamposComMovimentacao = new Set(
    (quadroTarefasDoDepartamento ?? []).flatMap((t) => Object.keys(t.valores ?? {})),
  );

  const { data: tiposProcesso } = await supabase
    .from('tipos_processo')
    .select('*')
    .eq('departamento_id', id)
    .order('status')
    .order('ordem')
    .returns<TipoProcesso[]>();

  const tiposProcessoAtivos = (tiposProcesso ?? []).filter((t) => t.status === 'ativo');

  const tipoIds = (tiposProcesso ?? []).map((t) => t.id);
  const { data: etapasDosTipos } =
    tipoIds.length > 0
      ? await supabase
          .from('etapas_modelo')
          .select('tipo_processo_id')
          .eq('status', 'ativo')
          .in('tipo_processo_id', tipoIds)
      : { data: [] };
  const contagemEtapasPorTipo = new Map<string, number>();
  for (const e of etapasDosTipos ?? []) {
    contagemEtapasPorTipo.set(e.tipo_processo_id, (contagemEtapasPorTipo.get(e.tipo_processo_id) ?? 0) + 1);
  }

  // Só pode excluir de verdade um tipo de serviço se nenhum processo já
  // tiver sido criado com ele — senão é só desativar.
  const { data: processosDoDepartamento } = await supabase
    .from('processos')
    .select('tipo_processo_id')
    .eq('departamento_id', id);
  const tiposComMovimentacao = new Set((processosDoDepartamento ?? []).map((p) => p.tipo_processo_id));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: 'Departamentos', href: '/departamentos' },
          ...(pai ? [{ label: pai.nome, href: `/departamentos/${pai.id}` }] : []),
          { label: departamento.nome },
        ]}
      />
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">{departamento.nome}</h1>
        {(filhos ?? []).length > 0 ? (
          <p className="text-sm text-muted">
            Subdepartamentos:{' '}
            {(filhos ?? []).map((f, i) => (
              <span key={f.id}>
                {i > 0 ? ', ' : ''}
                <Link href={`/departamentos/${f.id}`} className="underline">
                  {f.nome}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
        <div className="app-card p-6">
          <SimpleTextForm
            action={renameDepartamento.bind(null, id)}
            fieldName="nome"
            label="Renomear departamento"
            defaultValue={departamento.nome}
            submitLabel="Salvar nome"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Ferramentas habilitadas</h2>
        <div className="app-card p-6">
          <FerramentasDepartamentoForm
            action={updateDepartamentoFerramentas.bind(null, id)}
            usaTarefasPadrao={departamento.usa_tarefas_padrao}
            usaQuadroTarefas={departamento.usa_quadro_tarefas}
            usaFuncionarios={departamento.usa_funcionarios}
            usaProcessos={departamento.usa_processos}
            usaAlvaras={departamento.usa_alvaras}
            usaParcelamentos={departamento.usa_parcelamentos}
            usaCorresponsavel={departamento.usa_corresponsavel}
          />
        </div>
      </div>

      {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}

      {!departamento.usa_tarefas_padrao && !departamento.usa_quadro_tarefas ? (
        <p className="text-sm text-muted">
          Nenhuma ferramenta habilitada — marque a Tabela de Tarefas ou as Tarefas Avulsas acima
          pra configurar os campos deste departamento.
        </p>
      ) : null}

      {departamento.usa_tarefas_padrao ? (
        <>
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Colunas da Tabela de Tarefas</h2>
        <ul className="app-card flex flex-col divide-y divide-border">
          {(colunas ?? []).map((coluna) => {
            const index = colunasAtivas.findIndex((c) => c.id === coluna.id);
            const semMovimentacao = !colunasComMovimentacao.has(coluna.id);
            return (
              <li key={coluna.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span className="flex flex-wrap items-center gap-2">
                  {coluna.nome}
                  <Badge tone="neutral">{COLUNA_TIPO_LABELS[coluna.tipo]}</Badge>
                  {coluna.periodicidade !== 'mensal' ? (
                    <Badge tone="pending">
                      {COLUNA_PERIODICIDADE_LABELS[coluna.periodicidade]}:{' '}
                      {coluna.meses_aplicaveis
                        .slice()
                        .sort((a, b) => a - b)
                        .map((mes) => NOMES_MESES[mes - 1].slice(0, 3))
                        .join(', ')}
                    </Badge>
                  ) : null}
                  {coluna.status === 'inativo' ? <Badge tone="inactive">inativa</Badge> : null}
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/departamentos/${id}/colunas/${coluna.id}/editar`}
                    className="text-sm text-muted hover:underline"
                  >
                    Editar
                  </Link>
                  {COLUNA_TIPOS_COM_OPCOES.includes(coluna.tipo) ? (
                    <Link
                      href={`/departamentos/${id}/colunas/${coluna.id}/opcoes`}
                      className="text-sm text-muted hover:underline"
                    >
                      Opções
                    </Link>
                  ) : null}
                  {coluna.status === 'ativo' ? (
                    <>
                      <form action={moveColuna.bind(null, id, coluna.id, 'up')}>
                        <button
                          type="submit"
                          disabled={index <= 0}
                          className="text-sm text-muted hover:underline disabled:opacity-30"
                        >
                          Subir
                        </button>
                      </form>
                      <form action={moveColuna.bind(null, id, coluna.id, 'down')}>
                        <button
                          type="submit"
                          disabled={index === -1 || index >= colunasAtivas.length - 1}
                          className="text-sm text-muted hover:underline disabled:opacity-30"
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
                    <button type="submit" className="text-sm text-muted hover:underline">
                      {coluna.status === 'ativo' ? 'Desativar' : 'Reativar'}
                    </button>
                  </form>
                  {semMovimentacao ? (
                    <ConfirmFormButton
                      action={deleteColuna.bind(null, id, coluna.id)}
                      confirmMessage={`Excluir a coluna "${coluna.nome}"? Ela não tem nenhuma movimentação registrada. Essa ação não pode ser desfeita.`}
                      className="text-sm text-status-inactive hover:underline"
                    >
                      Excluir
                    </ConfirmFormButton>
                  ) : null}
                </div>
              </li>
            );
          })}
          {(colunas ?? []).length === 0 ? (
            <li className="p-4 text-sm text-muted">Nenhuma coluna cadastrada.</li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Nova coluna</h2>
        <div className="app-card p-6">
          <ColunaForm
            action={createColuna.bind(null, id)}
            usaFuncionarios={departamento.usa_funcionarios}
            usaCorresponsavel={departamento.usa_corresponsavel}
          />
        </div>
      </div>
        </>
      ) : null}

      {departamento.usa_quadro_tarefas ? (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Campos das Tarefas Avulsas</h2>
            <ul className="app-card flex flex-col divide-y divide-border">
              {(quadroCampos ?? []).map((campo) => {
                const index = quadroCamposAtivos.findIndex((c) => c.id === campo.id);
                const semMovimentacao = !quadroCamposComMovimentacao.has(campo.id);
                return (
                  <li
                    key={campo.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-4"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      {campo.nome}
                      <Badge tone="neutral">{COLUNA_TIPO_LABELS[campo.tipo]}</Badge>
                      {campo.status === 'inativo' ? <Badge tone="inactive">inativo</Badge> : null}
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/departamentos/${id}/quadro-campos/${campo.id}/editar`}
                        className="text-sm text-muted hover:underline"
                      >
                        Editar
                      </Link>
                      {COLUNA_TIPOS_COM_OPCOES.includes(campo.tipo) ? (
                        <Link
                          href={`/departamentos/${id}/quadro-campos/${campo.id}/opcoes`}
                          className="text-sm text-muted hover:underline"
                        >
                          Opções
                        </Link>
                      ) : null}
                      {campo.status === 'ativo' ? (
                        <>
                          <form action={moveQuadroCampo.bind(null, id, campo.id, 'up')}>
                            <button
                              type="submit"
                              disabled={index <= 0}
                              className="text-sm text-muted hover:underline disabled:opacity-30"
                            >
                              Subir
                            </button>
                          </form>
                          <form action={moveQuadroCampo.bind(null, id, campo.id, 'down')}>
                            <button
                              type="submit"
                              disabled={index === -1 || index >= quadroCamposAtivos.length - 1}
                              className="text-sm text-muted hover:underline disabled:opacity-30"
                            >
                              Descer
                            </button>
                          </form>
                        </>
                      ) : null}
                      <form
                        action={setQuadroCampoStatus.bind(
                          null,
                          id,
                          campo.id,
                          campo.status === 'ativo' ? 'inativo' : 'ativo',
                        )}
                      >
                        <button type="submit" className="text-sm text-muted hover:underline">
                          {campo.status === 'ativo' ? 'Desativar' : 'Reativar'}
                        </button>
                      </form>
                      {semMovimentacao ? (
                        <ConfirmFormButton
                          action={deleteQuadroCampo.bind(null, id, campo.id)}
                          confirmMessage={`Excluir o campo "${campo.nome}"? Ele não tem nenhuma movimentação registrada. Essa ação não pode ser desfeita.`}
                          className="text-sm text-status-inactive hover:underline"
                        >
                          Excluir
                        </ConfirmFormButton>
                      ) : null}
                    </div>
                  </li>
                );
              })}
              {(quadroCampos ?? []).length === 0 ? (
                <li className="p-4 text-sm text-muted">Nenhum campo cadastrado.</li>
              ) : null}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Novo campo</h2>
            <div className="app-card p-6">
              <QuadroCampoForm action={createQuadroCampo.bind(null, id)} />
            </div>
          </div>
        </>
      ) : null}

      {departamento.usa_processos ? (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Tipos de serviço</h2>
            <ul className="app-card flex flex-col divide-y divide-border">
              {(tiposProcesso ?? []).map((tipo) => {
                const index = tiposProcessoAtivos.findIndex((t) => t.id === tipo.id);
                const semMovimentacao = !tiposComMovimentacao.has(tipo.id);
                return (
                  <li key={tipo.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: tipo.cor }}
                      >
                        {tipo.codigo}
                      </span>
                      {tipo.nome}
                      <span className="text-xs text-muted">
                        {contagemEtapasPorTipo.get(tipo.id) ?? 0} etapa(s)
                      </span>
                      {tipo.status === 'inativo' ? <Badge tone="inactive">inativo</Badge> : null}
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/departamentos/${id}/tipos-processo/${tipo.id}/editar`}
                        className="text-sm text-muted hover:underline"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/departamentos/${id}/tipos-processo/${tipo.id}/etapas`}
                        className="text-sm text-muted hover:underline"
                      >
                        Etapas
                      </Link>
                      {tipo.status === 'ativo' ? (
                        <>
                          <form action={moveTipoProcesso.bind(null, id, tipo.id, 'up')}>
                            <button
                              type="submit"
                              disabled={index <= 0}
                              className="text-sm text-muted hover:underline disabled:opacity-30"
                            >
                              Subir
                            </button>
                          </form>
                          <form action={moveTipoProcesso.bind(null, id, tipo.id, 'down')}>
                            <button
                              type="submit"
                              disabled={index === -1 || index >= tiposProcessoAtivos.length - 1}
                              className="text-sm text-muted hover:underline disabled:opacity-30"
                            >
                              Descer
                            </button>
                          </form>
                        </>
                      ) : null}
                      <form
                        action={setTipoProcessoStatus.bind(
                          null,
                          id,
                          tipo.id,
                          tipo.status === 'ativo' ? 'inativo' : 'ativo',
                        )}
                      >
                        <button type="submit" className="text-sm text-muted hover:underline">
                          {tipo.status === 'ativo' ? 'Desativar' : 'Reativar'}
                        </button>
                      </form>
                      {semMovimentacao ? (
                        <ConfirmFormButton
                          action={deleteTipoProcesso.bind(null, id, tipo.id)}
                          confirmMessage={`Excluir o tipo de serviço "${tipo.nome}"? Ele nunca foi usado em nenhum processo. Essa ação não pode ser desfeita.`}
                          className="text-sm text-status-inactive hover:underline"
                        >
                          Excluir
                        </ConfirmFormButton>
                      ) : null}
                    </div>
                  </li>
                );
              })}
              {(tiposProcesso ?? []).length === 0 ? (
                <li className="p-4 text-sm text-muted">Nenhum tipo de serviço cadastrado.</li>
              ) : null}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Novo tipo de serviço</h2>
            <div className="app-card p-6">
              <TipoProcessoForm action={createTipoProcesso.bind(null, id)} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
