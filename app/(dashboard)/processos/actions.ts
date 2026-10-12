'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import {
  TAXA_JUCEMG_SITUACAO_LABELS,
  type ProcessoEtapaStatus,
  type ProcessoPrioridade,
  type ProcessoStatus,
  type TaxaJucemgSituacao,
} from '@/types/processo';

export type ProcessoFormState = {
  error: string | null;
};

export async function createProcesso(
  departamentoId: string,
  _prevState: ProcessoFormState,
  formData: FormData,
): Promise<ProcessoFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const tipoProcessoId = String(formData.get('tipo_processo_id') ?? '').trim();
  const titulo = String(formData.get('titulo') ?? '').trim();
  const prioridade = String(formData.get('prioridade') ?? 'normal') as ProcessoPrioridade;
  const responsavelId = String(formData.get('responsavel_id') ?? '').trim() || null;
  const prazoFinal = String(formData.get('prazo_final') ?? '').trim() || null;
  const clienteId = String(formData.get('cliente_id') ?? '').trim() || null;
  const clienteNomeAvulso = String(formData.get('cliente_nome_avulso') ?? '').trim() || null;
  const dataAbertura = String(formData.get('data_abertura') ?? '').trim() || null;
  const protocoloGeral = String(formData.get('protocolo_geral') ?? '').trim() || null;
  const observacoes = String(formData.get('observacoes') ?? '').trim() || null;

  if (!tipoProcessoId) return { error: 'Escolha um tipo de serviço.' };
  if (!titulo) return { error: 'Informe o título do serviço.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('criar_processo', {
    p_departamento_id: departamentoId,
    p_tipo_processo_id: tipoProcessoId,
    p_titulo: titulo,
    p_prioridade: prioridade,
    p_responsavel_id: responsavelId,
    p_prazo_final: prazoFinal,
    p_cliente_id: clienteId,
    p_cliente_nome_avulso: clienteNomeAvulso,
    p_data_abertura: dataAbertura,
    p_protocolo_geral: protocoloGeral,
    p_observacoes: observacoes,
  });

  if (error || !data) return { error: error?.message ?? 'Erro ao criar processo.' };

  revalidatePath('/processos');
  redirect(`/processos/${data.id}`);
}

export async function updateProcessoControleGeral(
  id: string,
  departamentoId: string,
  _prevState: ProcessoFormState,
  formData: FormData,
): Promise<ProcessoFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const titulo = String(formData.get('titulo') ?? '').trim();
  const status = String(formData.get('status') ?? 'ativo') as ProcessoStatus;
  const prioridade = String(formData.get('prioridade') ?? 'normal') as ProcessoPrioridade;
  const responsavelId = String(formData.get('responsavel_id') ?? '').trim() || null;
  const prazoFinal = String(formData.get('prazo_final') ?? '').trim() || null;
  const protocoloGeral = String(formData.get('protocolo_geral') ?? '').trim() || null;
  const observacoes = String(formData.get('observacoes') ?? '').trim() || null;

  if (!titulo) return { error: 'Informe o título do processo.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('processos')
    .update({
      titulo,
      status,
      prioridade,
      responsavel_id: responsavelId,
      prazo_final: prazoFinal,
      protocolo_geral: protocoloGeral,
      observacoes,
      concluido_em: status === 'concluido' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  await supabase
    .from('processo_eventos')
    .insert({ processo_id: id, descricao: 'Controle geral atualizado', criado_por: profile.id });

  revalidatePath(`/processos/${id}`);
  revalidatePath('/processos');
  return { error: null };
}

// Única ação que pode falhar de propósito (a regra "trava por taxa" vive na
// RPC atualizar_status_processo_etapa — ver migration
// 20260922100200_add_processos_rpc.sql) — por isso retorna o erro pro
// componente mostrar inline, ao contrário das outras ações desta tela.
export async function updateProcessoEtapaStatus(
  etapaId: string,
  status: ProcessoEtapaStatus,
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('atualizar_status_processo_etapa', {
    p_etapa_id: etapaId,
    p_status: status,
  });

  if (error) return { error: error.message };

  if (data) {
    revalidatePath(`/processos/${data.processo_id}`);
    revalidatePath('/processos');
    revalidatePath('/processos/jucemg');
  }
  return { error: null };
}

// Salva os campos padrão da etapa expandida (Prazo, Responsável, Protocolo,
// Status, Observações) de uma vez — via RPC, mesma trava de taxa JUCEMG do
// seletor rápido de status (ver migration
// 20260923110000_processo_etapa_campos_padrao.sql).
export async function updateProcessoEtapaDetalhes(
  etapaId: string,
  _prevState: ProcessoFormState,
  formData: FormData,
): Promise<ProcessoFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const status = String(formData.get('status') ?? 'pendente') as ProcessoEtapaStatus;
  const prazo = String(formData.get('prazo') ?? '').trim() || null;
  const responsavelId = String(formData.get('responsavel_id') ?? '').trim() || null;
  const protocolo = String(formData.get('protocolo') ?? '').trim() || null;
  const observacoes = String(formData.get('observacoes') ?? '').trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('atualizar_processo_etapa_detalhes', {
    p_etapa_id: etapaId,
    p_status: status,
    p_prazo: prazo,
    p_responsavel_id: responsavelId,
    p_protocolo: protocolo,
    p_observacoes: observacoes,
  });

  if (error) return { error: error.message };

  if (data) {
    revalidatePath(`/processos/${data.processo_id}`);
    revalidatePath('/processos');
    revalidatePath('/processos/jucemg');
  }
  return { error: null };
}

export async function updateProcessoTaxaJucemg(
  taxaId: string,
  processoId: string,
  _prevState: ProcessoFormState,
  formData: FormData,
): Promise<ProcessoFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const situacao = String(formData.get('situacao') ?? 'a_gerar') as TaxaJucemgSituacao;
  const numeroGuia = String(formData.get('numero_guia') ?? '').trim() || null;
  const valorRaw = String(formData.get('valor') ?? '').trim();
  const valor = valorRaw ? Number(valorRaw.replace(',', '.')) : null;
  const vencimento = String(formData.get('vencimento') ?? '').trim() || null;
  const dataPagamento = String(formData.get('data_pagamento') ?? '').trim() || null;
  const observacoes = String(formData.get('observacoes') ?? '').trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('processo_taxas_jucemg')
    .update({
      situacao,
      numero_guia: numeroGuia,
      valor,
      vencimento,
      data_pagamento: dataPagamento,
      observacoes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taxaId);

  if (error) return { error: error.message };

  await supabase.from('processo_eventos').insert({
    processo_id: processoId,
    descricao: `Taxa JUCEMG atualizada — situação: ${TAXA_JUCEMG_SITUACAO_LABELS[situacao]}`,
    criado_por: profile.id,
  });

  revalidatePath(`/processos/${processoId}`);
  revalidatePath('/processos/jucemg');
  return { error: null };
}

export async function setProcessoStatus(id: string, status: ProcessoStatus) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();
  await supabase
    .from('processos')
    .update({
      status,
      concluido_em: status === 'concluido' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  revalidatePath(`/processos/${id}`);
  revalidatePath('/processos');
}

export async function deleteProcesso(id: string, departamentoId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();

  // A policy de DELETE já bloqueia processo concluído (e quem não acessa o
  // departamento) — nesse caso o delete "funciona" sem erro, mas 0 linhas
  // são afetadas. Confirma via .select() que a linha saiu de verdade antes
  // de seguir pra lista como se tivesse dado certo.
  const { data } = await supabase.from('processos').delete().eq('id', id).select('id');
  if (!data || data.length === 0) {
    redirect(
      `/processos/${id}?erro=${encodeURIComponent('Não foi possível excluir — o processo pode já ter sido concluído.')}`,
    );
  }

  revalidatePath('/processos');
  revalidatePath('/processos/jucemg');
  redirect(`/processos?departamento=${departamentoId}`);
}
