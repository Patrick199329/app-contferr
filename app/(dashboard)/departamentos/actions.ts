'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import {
  COLUNA_TIPOS_COM_OPCOES,
  TIPOS_COM_MANTER_VALOR_ANTERIOR,
  type ColunaPeriodicidade,
  type ColunaTipo,
} from '@/types/departamento';
import { LINK_ICONE_PADRAO, LINK_ICONES, type LinkIconeKey } from '@/lib/link-icones';

function parseLinkIcone(formData: FormData): LinkIconeKey {
  const valor = String(formData.get('link_icone') ?? '');
  return valor in LINK_ICONES ? (valor as LinkIconeKey) : LINK_ICONE_PADRAO;
}

export type FormState = {
  error: string | null;
};

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }
}

function parsePeriodicidade(formData: FormData) {
  const periodicidade = String(formData.get('periodicidade') ?? 'mensal') as ColunaPeriodicidade;
  const mesesAplicaveis =
    periodicidade === 'mensal'
      ? []
      : formData
          .getAll('meses_aplicaveis')
          .map(Number)
          .filter((n) => n >= 1 && n <= 12);
  return { periodicidade, mesesAplicaveis };
}

export async function createDepartamento(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const parentId = String(formData.get('parent_id') ?? '').trim() || null;
  if (!nome) return { error: 'Informe o nome do departamento.' };

  const supabase = await createClient();
  let countQuery = supabase.from('departamentos').select('*', { count: 'exact', head: true });
  countQuery = parentId ? countQuery.eq('parent_id', parentId) : countQuery.is('parent_id', null);
  const { count } = await countQuery;

  const { error } = await supabase
    .from('departamentos')
    .insert({ nome, ordem: count ?? 0, parent_id: parentId });
  if (error) return { error: error.message };

  revalidatePath('/departamentos');
  redirect('/departamentos');
}

export async function renameDepartamento(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) return { error: 'Informe o nome do departamento.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('departamentos')
    .update({ nome, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/departamentos');
  revalidatePath(`/departamentos/${id}`);
  return { error: null };
}

export async function updateDepartamentoFerramentas(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const usaTarefasPadrao = formData.get('usa_tarefas_padrao') === 'on';
  const usaQuadroTarefas = formData.get('usa_quadro_tarefas') === 'on';
  const usaFuncionarios = formData.get('usa_funcionarios') === 'on';
  const usaProcessos = formData.get('usa_processos') === 'on';
  const usaAlvaras = formData.get('usa_alvaras') === 'on';
  const usaParcelamentos = formData.get('usa_parcelamentos') === 'on';
  const usaCorresponsavel = formData.get('usa_corresponsavel') === 'on';

  const supabase = await createClient();
  const { error } = await supabase
    .from('departamentos')
    .update({
      usa_tarefas_padrao: usaTarefasPadrao,
      usa_quadro_tarefas: usaQuadroTarefas,
      usa_funcionarios: usaFuncionarios,
      usa_processos: usaProcessos,
      usa_alvaras: usaAlvaras,
      usa_parcelamentos: usaParcelamentos,
      usa_corresponsavel: usaCorresponsavel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${id}`);
  revalidatePath('/parcelamentos');
  revalidatePath('/tarefas');
  revalidatePath('/quadro-tarefas');
  revalidatePath('/processos');
  revalidatePath('/alvaras');
  return { error: null };
}

export async function setDepartamentoStatus(id: string, status: 'ativo' | 'inativo') {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from('departamentos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/departamentos');
}

export async function createColuna(
  departamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? '') as ColunaTipo;
  const opcoesRaw = String(formData.get('opcoes') ?? '');
  const campoClienteAlvo =
    tipo === 'campo_cliente' ? String(formData.get('campo_cliente_alvo') ?? '') : null;
  const linkIcone = tipo === 'link' ? parseLinkIcone(formData) : LINK_ICONE_PADRAO;
  const linkUrl = tipo === 'link' ? String(formData.get('link_url') ?? '').trim() || null : null;
  // Só pode ser marcado pra tipos onde é um dado que tende a se repetir —
  // mesma restrição da UI (components/coluna-form.tsx) e reforçada no banco
  // (executar_virada_mensal só respeita esses tipos de qualquer forma).
  const ehCorresponsavel = tipo === 'responsavel' && formData.get('eh_corresponsavel') === 'on';
  const manterValorAnterior =
    ehCorresponsavel ||
    (TIPOS_COM_MANTER_VALOR_ANTERIOR.includes(tipo) && formData.get('manter_valor_anterior') === 'on');
  const { periodicidade, mesesAplicaveis } = parsePeriodicidade(formData);

  if (!nome) return { error: 'Informe o nome da coluna.' };
  if (tipo === 'link' && !linkUrl) return { error: 'Informe a URL do link.' };
  if (periodicidade !== 'mensal' && mesesAplicaveis.length === 0) {
    return { error: 'Marque pelo menos um mês pra essa periodicidade.' };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from('colunas')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId);

  const { data: coluna, error } = await supabase
    .from('colunas')
    .insert({
      departamento_id: departamentoId,
      nome,
      tipo,
      ordem: count ?? 0,
      periodicidade,
      meses_aplicaveis: mesesAplicaveis,
      campo_cliente_alvo: campoClienteAlvo,
      link_icone: linkIcone,
      link_url: linkUrl,
      manter_valor_anterior: manterValorAnterior,
      eh_corresponsavel: ehCorresponsavel,
    })
    .select('id')
    .single();

  if (error || !coluna) return { error: error?.message ?? 'Erro ao criar coluna.' };

  if (COLUNA_TIPOS_COM_OPCOES.includes(tipo)) {
    const opcoes = opcoesRaw
      .split('\n')
      .map((linha) => linha.trim())
      .filter(Boolean);

    if (opcoes.length > 0) {
      await supabase
        .from('opcoes_coluna')
        .insert(opcoes.map((valor, i) => ({ coluna_id: coluna.id, valor, ordem: i })));
    }
  }

  revalidatePath(`/departamentos/${departamentoId}`);
  redirect(`/departamentos/${departamentoId}`);
}

export async function updateColuna(
  departamentoId: string,
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? '') as ColunaTipo;
  const campoClienteAlvo =
    tipo === 'campo_cliente' ? String(formData.get('campo_cliente_alvo') ?? '') : null;
  const linkIcone = tipo === 'link' ? parseLinkIcone(formData) : LINK_ICONE_PADRAO;
  const linkUrl = tipo === 'link' ? String(formData.get('link_url') ?? '').trim() || null : null;
  const ehCorresponsavel = tipo === 'responsavel' && formData.get('eh_corresponsavel') === 'on';
  const manterValorAnterior =
    ehCorresponsavel ||
    (TIPOS_COM_MANTER_VALOR_ANTERIOR.includes(tipo) && formData.get('manter_valor_anterior') === 'on');
  const { periodicidade, mesesAplicaveis } = parsePeriodicidade(formData);

  if (!nome) return { error: 'Informe o nome da coluna.' };
  if (tipo === 'link' && !linkUrl) return { error: 'Informe a URL do link.' };
  if (periodicidade !== 'mensal' && mesesAplicaveis.length === 0) {
    return { error: 'Marque pelo menos um mês pra essa periodicidade.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('colunas')
    .update({
      nome,
      tipo,
      periodicidade,
      meses_aplicaveis: mesesAplicaveis,
      campo_cliente_alvo: campoClienteAlvo,
      link_icone: linkIcone,
      link_url: linkUrl,
      manter_valor_anterior: manterValorAnterior,
      eh_corresponsavel: ehCorresponsavel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}`);
  redirect(`/departamentos/${departamentoId}`);
}

export async function deleteColuna(departamentoId: string, id: string) {
  await requireAdmin();

  const supabase = await createClient();

  // Só pode excluir de verdade se nenhuma tarefa já tiver valor gravado
  // nessa coluna (a chave existe no JSONB `valores`, mesmo vazia) — senão é
  // só desativar, pra não perder histórico.
  const { count } = await supabase
    .from('tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId)
    .not(`valores->>${id}`, 'is', null);

  if ((count ?? 0) > 0) {
    redirect(
      `/departamentos/${departamentoId}?erro=${encodeURIComponent('Esta coluna já tem movimentações registradas — não é possível excluir, só desativar.')}`,
    );
  }

  const { error } = await supabase.from('colunas').delete().eq('id', id);
  if (error) {
    redirect(`/departamentos/${departamentoId}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function setColunaStatus(
  departamentoId: string,
  id: string,
  status: 'ativo' | 'inativo',
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from('colunas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function moveColuna(departamentoId: string, id: string, direction: 'up' | 'down') {
  await requireAdmin();

  const supabase = await createClient();
  const { data: colunas } = await supabase
    .from('colunas')
    .select('id, ordem')
    .eq('departamento_id', departamentoId)
    .eq('status', 'ativo')
    .order('ordem');

  if (!colunas) return;

  const index = colunas.findIndex((c) => c.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= colunas.length) return;

  const current = colunas[index];
  const target = colunas[swapWith];

  await supabase.from('colunas').update({ ordem: target.ordem }).eq('id', current.id);
  await supabase.from('colunas').update({ ordem: current.ordem }).eq('id', target.id);

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function createQuadroCampo(
  departamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? '') as ColunaTipo;
  const opcoesRaw = String(formData.get('opcoes') ?? '');

  if (!nome) return { error: 'Informe o nome do campo.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('quadro_tarefas_campos')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId);

  const { data: campo, error } = await supabase
    .from('quadro_tarefas_campos')
    .insert({ departamento_id: departamentoId, nome, tipo, ordem: count ?? 0 })
    .select('id')
    .single();

  if (error || !campo) return { error: error?.message ?? 'Erro ao criar campo.' };

  if (COLUNA_TIPOS_COM_OPCOES.includes(tipo)) {
    const opcoes = opcoesRaw
      .split('\n')
      .map((linha) => linha.trim())
      .filter(Boolean);

    if (opcoes.length > 0) {
      await supabase
        .from('quadro_tarefas_campos_opcoes')
        .insert(opcoes.map((valor, i) => ({ campo_id: campo.id, valor, ordem: i })));
    }
  }

  revalidatePath(`/departamentos/${departamentoId}`);
  redirect(`/departamentos/${departamentoId}`);
}

export async function updateQuadroCampo(
  departamentoId: string,
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? '') as ColunaTipo;

  if (!nome) return { error: 'Informe o nome do campo.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('quadro_tarefas_campos')
    .update({ nome, tipo, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}`);
  redirect(`/departamentos/${departamentoId}`);
}

export async function deleteQuadroCampo(departamentoId: string, id: string) {
  await requireAdmin();

  const supabase = await createClient();

  // Mesma regra de deleteColuna: só exclui de verdade se nenhuma tarefa do
  // Quadro já tiver valor gravado nesse campo — senão é só desativar.
  const { count } = await supabase
    .from('quadro_tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId)
    .not(`valores->>${id}`, 'is', null);

  if ((count ?? 0) > 0) {
    redirect(
      `/departamentos/${departamentoId}?erro=${encodeURIComponent('Este campo já tem movimentações registradas — não é possível excluir, só desativar.')}`,
    );
  }

  const { error } = await supabase.from('quadro_tarefas_campos').delete().eq('id', id);
  if (error) {
    redirect(`/departamentos/${departamentoId}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function setQuadroCampoStatus(
  departamentoId: string,
  id: string,
  status: 'ativo' | 'inativo',
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from('quadro_tarefas_campos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function moveQuadroCampo(departamentoId: string, id: string, direction: 'up' | 'down') {
  await requireAdmin();

  const supabase = await createClient();
  const { data: campos } = await supabase
    .from('quadro_tarefas_campos')
    .select('id, ordem')
    .eq('departamento_id', departamentoId)
    .eq('status', 'ativo')
    .order('ordem');

  if (!campos) return;

  const index = campos.findIndex((c) => c.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= campos.length) return;

  const current = campos[index];
  const target = campos[swapWith];

  await supabase.from('quadro_tarefas_campos').update({ ordem: target.ordem }).eq('id', current.id);
  await supabase.from('quadro_tarefas_campos').update({ ordem: current.ordem }).eq('id', target.id);

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function createQuadroCampoOpcao(
  campoId: string,
  departamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const valor = String(formData.get('valor') ?? '').trim();
  if (!valor) return { error: 'Informe o valor da opção.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('quadro_tarefas_campos_opcoes')
    .select('*', { count: 'exact', head: true })
    .eq('campo_id', campoId);

  const { error } = await supabase
    .from('quadro_tarefas_campos_opcoes')
    .insert({ campo_id: campoId, valor, ordem: count ?? 0 });

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes`);
  redirect(`/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes`);
}

export async function setQuadroCampoOpcaoStatus(
  departamentoId: string,
  campoId: string,
  id: string,
  status: 'ativo' | 'inativo',
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase.from('quadro_tarefas_campos_opcoes').update({ status }).eq('id', id);

  revalidatePath(`/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes`);
}

export async function moveQuadroCampoOpcao(
  departamentoId: string,
  campoId: string,
  id: string,
  direction: 'up' | 'down',
) {
  await requireAdmin();

  const supabase = await createClient();
  const { data: opcoes } = await supabase
    .from('quadro_tarefas_campos_opcoes')
    .select('id, ordem')
    .eq('campo_id', campoId)
    .eq('status', 'ativo')
    .order('ordem');

  if (!opcoes) return;

  const index = opcoes.findIndex((o) => o.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= opcoes.length) return;

  const current = opcoes[index];
  const target = opcoes[swapWith];

  await supabase
    .from('quadro_tarefas_campos_opcoes')
    .update({ ordem: target.ordem })
    .eq('id', current.id);
  await supabase
    .from('quadro_tarefas_campos_opcoes')
    .update({ ordem: current.ordem })
    .eq('id', target.id);

  revalidatePath(`/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes`);
}

export async function updateQuadroCampoOpcao(
  departamentoId: string,
  campoId: string,
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const valor = String(formData.get('valor') ?? '').trim();
  if (!valor) return { error: 'Informe o valor da opção.' };

  const supabase = await createClient();
  const { error } = await supabase.from('quadro_tarefas_campos_opcoes').update({ valor }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes`);
  return { error: null };
}

export async function deleteQuadroCampoOpcao(departamentoId: string, campoId: string, id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { data: opcao } = await supabase
    .from('quadro_tarefas_campos_opcoes')
    .select('valor')
    .eq('id', id)
    .single();

  if (!opcao) return;

  // Assim como colunas/campos, só exclui de verdade se nenhuma tarefa já
  // tiver essa opção gravada como valor — o valor é salvo por texto (não por
  // id da opção), então a checagem é por igualdade de string na chave do campo.
  const { count } = await supabase
    .from('quadro_tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId)
    .eq(`valores->>${campoId}`, opcao.valor);

  if ((count ?? 0) > 0) {
    redirect(
      `/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes?erro=${encodeURIComponent('Esta opção já foi usada em alguma tarefa — não é possível excluir, só desativar.')}`,
    );
  }

  const { error } = await supabase.from('quadro_tarefas_campos_opcoes').delete().eq('id', id);
  if (error) {
    redirect(
      `/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes?erro=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/departamentos/${departamentoId}/quadro-campos/${campoId}/opcoes`);
}

export async function createOpcao(
  colunaId: string,
  departamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const valor = String(formData.get('valor') ?? '').trim();
  if (!valor) return { error: 'Informe o valor da opção.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('opcoes_coluna')
    .select('*', { count: 'exact', head: true })
    .eq('coluna_id', colunaId);

  const { error } = await supabase
    .from('opcoes_coluna')
    .insert({ coluna_id: colunaId, valor, ordem: count ?? 0 });

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}/colunas/${colunaId}/opcoes`);
  redirect(`/departamentos/${departamentoId}/colunas/${colunaId}/opcoes`);
}

export async function setOpcaoStatus(
  departamentoId: string,
  colunaId: string,
  id: string,
  status: 'ativo' | 'inativo',
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase.from('opcoes_coluna').update({ status }).eq('id', id);

  revalidatePath(`/departamentos/${departamentoId}/colunas/${colunaId}/opcoes`);
}

export async function moveOpcao(
  departamentoId: string,
  colunaId: string,
  id: string,
  direction: 'up' | 'down',
) {
  await requireAdmin();

  const supabase = await createClient();
  const { data: opcoes } = await supabase
    .from('opcoes_coluna')
    .select('id, ordem')
    .eq('coluna_id', colunaId)
    .eq('status', 'ativo')
    .order('ordem');

  if (!opcoes) return;

  const index = opcoes.findIndex((o) => o.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= opcoes.length) return;

  const current = opcoes[index];
  const target = opcoes[swapWith];

  await supabase.from('opcoes_coluna').update({ ordem: target.ordem }).eq('id', current.id);
  await supabase.from('opcoes_coluna').update({ ordem: current.ordem }).eq('id', target.id);

  revalidatePath(`/departamentos/${departamentoId}/colunas/${colunaId}/opcoes`);
}

export async function updateOpcao(
  departamentoId: string,
  colunaId: string,
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const valor = String(formData.get('valor') ?? '').trim();
  if (!valor) return { error: 'Informe o valor da opção.' };

  const supabase = await createClient();
  const { error } = await supabase.from('opcoes_coluna').update({ valor }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}/colunas/${colunaId}/opcoes`);
  return { error: null };
}

export async function deleteOpcao(departamentoId: string, colunaId: string, id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { data: opcao } = await supabase
    .from('opcoes_coluna')
    .select('valor')
    .eq('id', id)
    .single();

  if (!opcao) return;

  // Mesma regra de deleteQuadroCampoOpcao: valor gravado por texto, não por
  // id da opção — checa igualdade de string na chave da coluna.
  const { count } = await supabase
    .from('tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId)
    .eq(`valores->>${colunaId}`, opcao.valor);

  if ((count ?? 0) > 0) {
    redirect(
      `/departamentos/${departamentoId}/colunas/${colunaId}/opcoes?erro=${encodeURIComponent('Esta opção já foi usada em alguma tarefa — não é possível excluir, só desativar.')}`,
    );
  }

  const { error } = await supabase.from('opcoes_coluna').delete().eq('id', id);
  if (error) {
    redirect(
      `/departamentos/${departamentoId}/colunas/${colunaId}/opcoes?erro=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/departamentos/${departamentoId}/colunas/${colunaId}/opcoes`);
}

// ---- Tipos de serviço + Etapas-modelo (ferramenta "Processos") ----

export async function createTipoProcesso(
  departamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const codigo = String(formData.get('codigo') ?? '').trim().toUpperCase();
  const cor = String(formData.get('cor') ?? '#2563eb').trim();

  if (!nome) return { error: 'Informe o nome do tipo de serviço.' };
  if (codigo.length < 2 || codigo.length > 4) return { error: 'O código precisa ter de 2 a 4 letras.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('tipos_processo')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId);

  const { error } = await supabase
    .from('tipos_processo')
    .insert({ departamento_id: departamentoId, nome, codigo, cor, ordem: count ?? 0 });

  if (error) {
    const message = error.code === '23505' ? 'Já existe um tipo de serviço com esse código.' : error.message;
    return { error: message };
  }

  revalidatePath(`/departamentos/${departamentoId}`);
  redirect(`/departamentos/${departamentoId}`);
}

export async function updateTipoProcesso(
  departamentoId: string,
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const codigo = String(formData.get('codigo') ?? '').trim().toUpperCase();
  const cor = String(formData.get('cor') ?? '#2563eb').trim();

  if (!nome) return { error: 'Informe o nome do tipo de serviço.' };
  if (codigo.length < 2 || codigo.length > 4) return { error: 'O código precisa ter de 2 a 4 letras.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('tipos_processo')
    .update({ nome, codigo, cor, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    const message = error.code === '23505' ? 'Já existe um tipo de serviço com esse código.' : error.message;
    return { error: message };
  }

  revalidatePath(`/departamentos/${departamentoId}`);
  redirect(`/departamentos/${departamentoId}`);
}

export async function setTipoProcessoStatus(
  departamentoId: string,
  id: string,
  status: 'ativo' | 'inativo',
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from('tipos_processo')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function moveTipoProcesso(departamentoId: string, id: string, direction: 'up' | 'down') {
  await requireAdmin();

  const supabase = await createClient();
  const { data: tipos } = await supabase
    .from('tipos_processo')
    .select('id, ordem')
    .eq('departamento_id', departamentoId)
    .eq('status', 'ativo')
    .order('ordem');

  if (!tipos) return;

  const index = tipos.findIndex((t) => t.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= tipos.length) return;

  const current = tipos[index];
  const target = tipos[swapWith];

  await supabase.from('tipos_processo').update({ ordem: target.ordem }).eq('id', current.id);
  await supabase.from('tipos_processo').update({ ordem: current.ordem }).eq('id', target.id);

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function deleteTipoProcesso(departamentoId: string, id: string) {
  await requireAdmin();

  const supabase = await createClient();

  // Só exclui de verdade se nenhum processo já tiver sido criado com esse
  // tipo — senão é só desativar, pra não perder o vínculo histórico.
  const { count } = await supabase
    .from('processos')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_processo_id', id);

  if ((count ?? 0) > 0) {
    redirect(
      `/departamentos/${departamentoId}?erro=${encodeURIComponent('Este tipo já tem processos criados — não é possível excluir, só desativar.')}`,
    );
  }

  const { error } = await supabase.from('tipos_processo').delete().eq('id', id);
  if (error) {
    redirect(`/departamentos/${departamentoId}?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/departamentos/${departamentoId}`);
}

export async function createEtapaModelo(
  departamentoId: string,
  tipoProcessoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const travaPorTaxaJucemg = formData.get('trava_por_taxa_jucemg') === 'on';

  if (!nome) return { error: 'Informe o nome da etapa.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('etapas_modelo')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_processo_id', tipoProcessoId);

  const { error } = await supabase
    .from('etapas_modelo')
    .insert({
      tipo_processo_id: tipoProcessoId,
      nome,
      trava_por_taxa_jucemg: travaPorTaxaJucemg,
      ordem: count ?? 0,
    });

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas`);
  redirect(`/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas`);
}

export async function updateEtapaModelo(
  departamentoId: string,
  tipoProcessoId: string,
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const travaPorTaxaJucemg = formData.get('trava_por_taxa_jucemg') === 'on';

  if (!nome) return { error: 'Informe o nome da etapa.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('etapas_modelo')
    .update({ nome, trava_por_taxa_jucemg: travaPorTaxaJucemg, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas`);
  redirect(`/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas`);
}

export async function setEtapaModeloStatus(
  departamentoId: string,
  tipoProcessoId: string,
  id: string,
  status: 'ativo' | 'inativo',
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from('etapas_modelo')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas`);
}

export async function moveEtapaModelo(
  departamentoId: string,
  tipoProcessoId: string,
  id: string,
  direction: 'up' | 'down',
) {
  await requireAdmin();

  const supabase = await createClient();
  const { data: etapas } = await supabase
    .from('etapas_modelo')
    .select('id, ordem')
    .eq('tipo_processo_id', tipoProcessoId)
    .eq('status', 'ativo')
    .order('ordem');

  if (!etapas) return;

  const index = etapas.findIndex((e) => e.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= etapas.length) return;

  const current = etapas[index];
  const target = etapas[swapWith];

  await supabase.from('etapas_modelo').update({ ordem: target.ordem }).eq('id', current.id);
  await supabase.from('etapas_modelo').update({ ordem: current.ordem }).eq('id', target.id);

  revalidatePath(`/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas`);
}

export async function deleteEtapaModelo(departamentoId: string, tipoProcessoId: string, id: string) {
  await requireAdmin();

  const supabase = await createClient();

  // Só exclui de verdade se nenhum processo já tiver copiado essa etapa —
  // senão é só desativar, pra não perder o vínculo histórico.
  const { count } = await supabase
    .from('processo_etapas')
    .select('*', { count: 'exact', head: true })
    .eq('etapa_modelo_id', id);

  if ((count ?? 0) > 0) {
    redirect(
      `/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas?erro=${encodeURIComponent('Esta etapa já foi usada em processos — não é possível excluir, só desativar.')}`,
    );
  }

  const { error } = await supabase.from('etapas_modelo').delete().eq('id', id);
  if (error) {
    redirect(
      `/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas?erro=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/departamentos/${departamentoId}/tipos-processo/${tipoProcessoId}/etapas`);
}
