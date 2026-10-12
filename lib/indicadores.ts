import { colunaAplicavelNoMes } from '@/lib/colunas-periodicidade';
import { currentCompetencia } from '@/lib/competencia';
import { filtrarPorFerramenta, getDepartamentosSelecionaveis } from '@/lib/departamentos-tree';
import { selectEmLotes } from '@/lib/supabase/batch';
import {
  getDepartamentosPermitidos,
  podeAcessarDepartamento,
  type DepartamentosPermitidos,
} from '@/lib/supabase/permissoes';
import { createClient } from '@/lib/supabase/server';
import { temPendencia } from '@/lib/tem-pendencia';
import type { Coluna, Departamento } from '@/types/departamento';

async function getDepartamentosComFerramenta(
  ferramenta: 'usa_tarefas_padrao' | 'usa_quadro_tarefas',
): Promise<{ selecionaveis: Departamento[]; permitidos: DepartamentosPermitidos }> {
  const supabase = await createClient();
  const [{ data: todosDepartamentos }, permitidos] = await Promise.all([
    supabase.from('departamentos').select('*').eq('status', 'ativo').returns<Departamento[]>(),
    getDepartamentosPermitidos(),
  ]);

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], ferramenta);
  const acessiveis = comFerramenta.filter((d) => podeAcessarDepartamento(permitidos, d.id));
  const selecionaveis = getDepartamentosSelecionaveis(acessiveis);

  return { selecionaveis, permitidos };
}

export type UrgenciaQuadro = 'atrasada' | 'hoje' | 'proximos_7_dias';

export type QuadroPendencia = {
  id: string;
  numero: number;
  titulo: string;
  prazo: string;
  clienteNome: string | null;
  departamentoId: string;
  departamentoNome: string;
  urgencia: UrgenciaQuadro;
};

// Tarefas do Quadro atribuídas ao usuário, vencidas ou vencendo nos
// próximos 7 dias — o cabeçalho só conta atrasada+hoje; o Dashboard mostra
// os 3 grupos.
export async function getPendenciasQuadroDoUsuario(profileId: string): Promise<QuadroPendencia[]> {
  const { selecionaveis } = await getDepartamentosComFerramenta('usa_quadro_tarefas');
  if (selecionaveis.length === 0) return [];

  const departamentoNomePorId = new Map(selecionaveis.map((d) => [d.id, d.nome]));
  const hoje = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: tarefas } = await supabase
    .from('quadro_tarefas')
    .select('id, numero, titulo, prazo, cliente_id, departamento_id')
    .eq('responsavel_id', profileId)
    .neq('status', 'concluida')
    .not('prazo', 'is', null)
    .lte('prazo', limite)
    .in(
      'departamento_id',
      selecionaveis.map((d) => d.id),
    )
    .order('prazo');

  if (!tarefas || tarefas.length === 0) return [];

  const clienteIds = [...new Set(tarefas.map((t) => t.cliente_id).filter((id): id is string => !!id))];
  const clientes = await selectEmLotes(clienteIds, (lote) =>
    supabase.from('clientes').select('id, nome_fantasia').in('id', lote),
  );
  const clienteNomePorId = new Map(clientes.map((c) => [c.id, c.nome_fantasia]));

  return tarefas.map((t) => {
    const prazo = t.prazo as string;
    const urgencia: UrgenciaQuadro = prazo < hoje ? 'atrasada' : prazo === hoje ? 'hoje' : 'proximos_7_dias';
    return {
      id: t.id,
      numero: t.numero,
      titulo: t.titulo,
      prazo,
      clienteNome: t.cliente_id ? (clienteNomePorId.get(t.cliente_id) ?? null) : null,
      departamentoId: t.departamento_id,
      departamentoNome: departamentoNomePorId.get(t.departamento_id) ?? '—',
      urgencia,
    };
  });
}

export type QuadroPendenciaSetor = {
  id: string;
  numero: number;
  titulo: string;
  prazo: string;
  clienteNome: string | null;
  departamentoId: string;
  departamentoNome: string;
  responsavelNome: string;
};

// Tarefas Avulsas atrasadas de QUALQUER pessoa nos departamentos que o
// gerente/admin acessa — diferente de getPendenciasQuadroDoUsuario (que só
// olha as do próprio usuário), isso é o que dá a visão "alguém da equipe
// está atrasado?" pro gestor, sem precisar abrir tarefa por tarefa.
export async function getPendenciasQuadroSetor(
  permitidos: DepartamentosPermitidos,
): Promise<QuadroPendenciaSetor[]> {
  const { selecionaveis } = await getDepartamentosComFerramenta('usa_quadro_tarefas');
  const acessiveis = selecionaveis.filter((d) => podeAcessarDepartamento(permitidos, d.id));
  if (acessiveis.length === 0) return [];

  const departamentoNomePorId = new Map(acessiveis.map((d) => [d.id, d.nome]));
  const hoje = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: tarefas } = await supabase
    .from('quadro_tarefas')
    .select('id, numero, titulo, prazo, cliente_id, departamento_id, responsavel_id')
    .neq('status', 'concluida')
    .not('prazo', 'is', null)
    .lt('prazo', hoje)
    .in(
      'departamento_id',
      acessiveis.map((d) => d.id),
    )
    .order('prazo');

  if (!tarefas || tarefas.length === 0) return [];

  const clienteIds = [...new Set(tarefas.map((t) => t.cliente_id).filter((id): id is string => !!id))];
  const responsavelIds = [
    ...new Set(tarefas.map((t) => t.responsavel_id).filter((id): id is string => !!id)),
  ];
  const [clientes, responsaveis] = await Promise.all([
    selectEmLotes(clienteIds, (lote) =>
      supabase.from('clientes').select('id, nome_fantasia').in('id', lote),
    ),
    selectEmLotes(responsavelIds, (lote) =>
      supabase.from('profiles').select('id, nome, email').in('id', lote),
    ),
  ]);
  const clienteNomePorId = new Map(clientes.map((c) => [c.id, c.nome_fantasia]));
  const responsavelNomePorId = new Map(responsaveis.map((p) => [p.id, p.nome || p.email]));

  return tarefas.map((t) => ({
    id: t.id,
    numero: t.numero,
    titulo: t.titulo,
    prazo: t.prazo as string,
    clienteNome: t.cliente_id ? (clienteNomePorId.get(t.cliente_id) ?? null) : null,
    departamentoId: t.departamento_id,
    departamentoNome: departamentoNomePorId.get(t.departamento_id) ?? '—',
    responsavelNome: t.responsavel_id
      ? (responsavelNomePorId.get(t.responsavel_id) ?? '—')
      : 'Sem responsável',
  }));
}

export type ClientePendente = {
  clienteId: string;
  clienteNome: string;
  departamentoId: string;
  departamentoNome: string;
  souCorresponsavel: boolean;
};

// Monta, pros departamentos informados, os mapas de colunas ativas e das
// linhas de `tarefas` do mês corrente — reaproveitado por
// getClientesComPendenciaDoUsuario e getResumoDepartamentos, pra não repetir
// as mesmas 3 queries duas vezes.
async function getContextoPendenciaTabela(departamentoIds: string[]) {
  const supabase = await createClient();
  const competencia = currentCompetencia();

  const [{ data: colunas }, { data: vinculos }, { data: tarefas }] = await Promise.all([
    supabase
      .from('colunas')
      .select('id, departamento_id, tipo, periodicidade, meses_aplicaveis, eh_corresponsavel')
      .in('departamento_id', departamentoIds)
      .eq('status', 'ativo'),
    supabase
      .from('cliente_departamentos')
      .select('cliente_id, departamento_id, responsavel_padrao_id')
      .in('departamento_id', departamentoIds),
    supabase
      .from('tarefas')
      .select('cliente_id, departamento_id, valores, responsavel_padrao_id')
      .in('departamento_id', departamentoIds)
      .eq('competencia', competencia),
  ]);

  // Só entram as colunas que de fato aparecem nesta competência — uma coluna
  // trimestral/semestral/anual fora do mês não pode contar como pendência
  // (a Tabela de Tarefas nem mostra ela pro usuário preencher).
  const colunasPorDepartamento = new Map<string, Pick<Coluna, 'id' | 'tipo'>[]>();
  const colunasCorresponsavelIds = new Set<string>();
  for (const c of colunas ?? []) {
    if (!colunaAplicavelNoMes(c, competencia)) continue;
    colunasPorDepartamento.set(c.departamento_id, [
      ...(colunasPorDepartamento.get(c.departamento_id) ?? []),
      { id: c.id, tipo: c.tipo },
    ]);
    if (c.eh_corresponsavel) colunasCorresponsavelIds.add(c.id);
  }

  const tarefaPorChave = new Map(
    (tarefas ?? []).map((t) => [`${t.cliente_id}:${t.departamento_id}`, t]),
  );

  return {
    vinculos: vinculos ?? [],
    colunasPorDepartamento,
    colunasCorresponsavelIds,
    tarefaPorChave,
  };
}

// Clientes cujo responsável efetivo (mesma fórmula de
// components/tarefas-table.tsx: valor da linha do mês, senão o padrão do
// cadastro) é o usuário informado, ou em que ele aparece numa coluna de
// corresponsável, e que têm pendência este mês.
export async function getClientesComPendenciaDoUsuario(profileId: string): Promise<ClientePendente[]> {
  const { selecionaveis } = await getDepartamentosComFerramenta('usa_tarefas_padrao');
  if (selecionaveis.length === 0) return [];

  const departamentoIds = selecionaveis.map((d) => d.id);
  const departamentoNomePorId = new Map(selecionaveis.map((d) => [d.id, d.nome]));
  const { vinculos, colunasPorDepartamento, colunasCorresponsavelIds, tarefaPorChave } =
    await getContextoPendenciaTabela(departamentoIds);

  const meus = vinculos.filter((v) => {
    const tarefa = tarefaPorChave.get(`${v.cliente_id}:${v.departamento_id}`);
    const efetivo = tarefa ? tarefa.responsavel_padrao_id : v.responsavel_padrao_id;
    if (efetivo === profileId) return true;
    return [...colunasCorresponsavelIds].some((id) => tarefa?.valores?.[id] === profileId);
  });
  if (meus.length === 0) return [];

  const pendentes = meus.filter((v) => {
    const tarefa = tarefaPorChave.get(`${v.cliente_id}:${v.departamento_id}`);
    const colunasDoDepartamento = colunasPorDepartamento.get(v.departamento_id) ?? [];
    return temPendencia(colunasDoDepartamento, tarefa?.valores);
  });
  if (pendentes.length === 0) return [];

  const supabase = await createClient();
  const clienteIds = [...new Set(pendentes.map((v) => v.cliente_id))];
  const clientes = await selectEmLotes(clienteIds, (lote) =>
    supabase.from('clientes').select('id, nome_fantasia').in('id', lote),
  );
  const clienteNomePorId = new Map(clientes.map((c) => [c.id, c.nome_fantasia]));

  return pendentes.map((v) => {
    const tarefa = tarefaPorChave.get(`${v.cliente_id}:${v.departamento_id}`);
    const efetivo = tarefa ? tarefa.responsavel_padrao_id : v.responsavel_padrao_id;
    return {
      clienteId: v.cliente_id,
      clienteNome: clienteNomePorId.get(v.cliente_id) ?? '—',
      departamentoId: v.departamento_id,
      departamentoNome: departamentoNomePorId.get(v.departamento_id) ?? '—',
      souCorresponsavel: efetivo !== profileId,
    };
  });
}

export type ResumoDepartamento = {
  departamentoId: string;
  departamentoNome: string;
  totalClientes: number;
  clientesComPendencia: number;
  percentualConcluido: number | null;
  clientesSemResponsavel: number;
};

// Seção "Departamento" do Dashboard — visão de quem gerencia, não do
// usuário comum.
export async function getResumoDepartamentos(
  permitidos: DepartamentosPermitidos,
): Promise<ResumoDepartamento[]> {
  const supabase = await createClient();
  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .returns<Departamento[]>();

  const comFerramenta = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_tarefas_padrao');
  const acessiveis = comFerramenta.filter((d) => podeAcessarDepartamento(permitidos, d.id));
  const selecionaveis = getDepartamentosSelecionaveis(acessiveis);
  if (selecionaveis.length === 0) return [];

  const departamentoIds = selecionaveis.map((d) => d.id);
  const { vinculos, colunasPorDepartamento, tarefaPorChave } =
    await getContextoPendenciaTabela(departamentoIds);

  return selecionaveis.map((dep) => {
    const doDepartamento = vinculos.filter((v) => v.departamento_id === dep.id);
    const colunasDoDepartamento = colunasPorDepartamento.get(dep.id) ?? [];

    let comPendencia = 0;
    let semResponsavel = 0;
    for (const v of doDepartamento) {
      const tarefa = tarefaPorChave.get(`${v.cliente_id}:${dep.id}`);
      const efetivo = tarefa ? tarefa.responsavel_padrao_id : v.responsavel_padrao_id;
      if (!efetivo) semResponsavel += 1;
      if (temPendencia(colunasDoDepartamento, tarefa?.valores)) comPendencia += 1;
    }

    return {
      departamentoId: dep.id,
      departamentoNome: dep.nome,
      totalClientes: doDepartamento.length,
      clientesComPendencia: comPendencia,
      percentualConcluido:
        doDepartamento.length > 0
          ? Math.round(((doDepartamento.length - comPendencia) / doDepartamento.length) * 100)
          : null,
      clientesSemResponsavel: semResponsavel,
    };
  });
}

export type CargaResponsavel = {
  profileId: string;
  nome: string;
  pendenciasQuadro: number;
  pendenciasTabela: number;
};

// Quantas pendências (Quadro + Tabela) cada pessoa carrega hoje, nos
// departamentos que o gerente/admin acessa — pra achar desequilíbrio de
// carga entre a equipe.
export async function getCargaPorResponsavel(
  permitidos: DepartamentosPermitidos,
): Promise<CargaResponsavel[]> {
  const supabase = await createClient();
  const contagem = new Map<string, { pendenciasQuadro: number; pendenciasTabela: number }>();

  function incrementa(id: string | null, campo: 'pendenciasQuadro' | 'pendenciasTabela') {
    if (!id) return;
    const atual = contagem.get(id) ?? { pendenciasQuadro: 0, pendenciasTabela: 0 };
    atual[campo] += 1;
    contagem.set(id, atual);
  }

  const { selecionaveis: departamentosQuadro } = await getDepartamentosComFerramenta(
    'usa_quadro_tarefas',
  );
  const departamentosQuadroAcessiveis = departamentosQuadro.filter((d) =>
    podeAcessarDepartamento(permitidos, d.id),
  );
  if (departamentosQuadroAcessiveis.length > 0) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: tarefasQuadro } = await supabase
      .from('quadro_tarefas')
      .select('responsavel_id')
      .neq('status', 'concluida')
      .not('prazo', 'is', null)
      .lte('prazo', hoje)
      .in(
        'departamento_id',
        departamentosQuadroAcessiveis.map((d) => d.id),
      );
    for (const t of tarefasQuadro ?? []) incrementa(t.responsavel_id, 'pendenciasQuadro');
  }

  const { data: todosDepartamentos } = await supabase
    .from('departamentos')
    .select('*')
    .eq('status', 'ativo')
    .returns<Departamento[]>();
  const comFerramentaTabela = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_tarefas_padrao');
  const departamentosTabelaAcessiveis = getDepartamentosSelecionaveis(
    comFerramentaTabela.filter((d) => podeAcessarDepartamento(permitidos, d.id)),
  );

  if (departamentosTabelaAcessiveis.length > 0) {
    const { vinculos, colunasPorDepartamento, tarefaPorChave } = await getContextoPendenciaTabela(
      departamentosTabelaAcessiveis.map((d) => d.id),
    );
    for (const v of vinculos) {
      const tarefa = tarefaPorChave.get(`${v.cliente_id}:${v.departamento_id}`);
      const efetivo = tarefa ? tarefa.responsavel_padrao_id : v.responsavel_padrao_id;
      const colunasDoDepartamento = colunasPorDepartamento.get(v.departamento_id) ?? [];
      if (efetivo && temPendencia(colunasDoDepartamento, tarefa?.valores)) {
        incrementa(efetivo, 'pendenciasTabela');
      }
    }
  }

  if (contagem.size === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome, email')
    .in('id', [...contagem.keys()]);
  const nomePorId = new Map((profiles ?? []).map((p) => [p.id, p.nome || p.email]));

  return [...contagem.entries()]
    .map(([profileId, valores]) => ({
      profileId,
      nome: nomePorId.get(profileId) ?? '—',
      ...valores,
    }))
    .sort(
      (a, b) =>
        b.pendenciasQuadro + b.pendenciasTabela - (a.pendenciasQuadro + a.pendenciasTabela),
    );
}
