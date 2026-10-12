'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { QuadroTarefaStatus, RecorrenciaFrequencia } from '@/types/quadro-tarefa';

async function montarValoresCampos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  departamentoId: string,
  formData: FormData,
): Promise<Record<string, string>> {
  const { data: campos } = await supabase
    .from('quadro_tarefas_campos')
    .select('id')
    .eq('departamento_id', departamentoId)
    .eq('status', 'ativo');

  const valores: Record<string, string> = {};
  for (const campo of campos ?? []) {
    const valor = String(formData.get(`campo_${campo.id}`) ?? '').trim();
    if (valor) valores[campo.id] = valor;
  }
  return valores;
}

function proximaDataApos(dataISO: string, frequencia: RecorrenciaFrequencia, intervalo: number) {
  const d = new Date(`${dataISO}T00:00:00`);
  if (frequencia === 'diaria') d.setDate(d.getDate() + intervalo);
  else if (frequencia === 'semanal') d.setDate(d.getDate() + intervalo * 7);
  else d.setMonth(d.getMonth() + intervalo);
  return d.toISOString().slice(0, 10);
}

export type FormState = {
  error: string | null;
};

type ParsedQuadroTarefa =
  | {
      ok: true;
      titulo: string;
      descricao: string | null;
      responsavelId: string | null;
      clienteId: string | null;
      prazo: string | null;
    }
  | { ok: false; error: string };

function parseQuadroTarefaForm(formData: FormData): ParsedQuadroTarefa {
  const titulo = String(formData.get('titulo') ?? '').trim();
  const descricao = String(formData.get('descricao') ?? '').trim();
  const responsavelId = String(formData.get('responsavel_id') ?? '').trim();
  const clienteId = String(formData.get('cliente_id') ?? '').trim();
  const prazo = String(formData.get('prazo') ?? '').trim();

  if (!titulo) return { ok: false, error: 'Informe o título da tarefa.' };

  return {
    ok: true,
    titulo,
    descricao: descricao || null,
    responsavelId: responsavelId || null,
    clienteId: clienteId || null,
    prazo: prazo || null,
  };
}

export async function createQuadroTarefa(
  departamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const parsed = parseQuadroTarefaForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const recorrente = formData.get('recorrente') === 'on';
  if (recorrente && !parsed.prazo) {
    return { error: 'Informe o prazo para criar uma tarefa recorrente.' };
  }

  const supabase = await createClient();
  const valores = await montarValoresCampos(supabase, departamentoId, formData);

  let recorrenciaId: string | null = null;
  if (recorrente && parsed.prazo) {
    const frequencia = String(formData.get('frequencia') ?? 'semanal') as RecorrenciaFrequencia;
    const intervaloRaw = Number(formData.get('intervalo') ?? 1);
    const intervalo = Number.isFinite(intervaloRaw) && intervaloRaw > 0 ? Math.trunc(intervaloRaw) : 1;
    const dataFim = String(formData.get('data_fim') ?? '').trim() || null;

    const { data: recorrencia, error: recorrenciaError } = await supabase
      .from('quadro_tarefas_recorrencias')
      .insert({
        departamento_id: departamentoId,
        cliente_id: parsed.clienteId,
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        responsavel_id: parsed.responsavelId,
        criado_por: profile.id,
        frequencia,
        intervalo,
        proxima_data: proximaDataApos(parsed.prazo, frequencia, intervalo),
        data_fim: dataFim,
      })
      .select('id');

    if (recorrenciaError) return { error: recorrenciaError.message };
    if (!recorrencia || recorrencia.length === 0) {
      return { error: 'Você não tem acesso a este departamento.' };
    }
    recorrenciaId = recorrencia[0].id;
  }

  const { data, error } = await supabase
    .from('quadro_tarefas')
    .insert({
      departamento_id: departamentoId,
      titulo: parsed.titulo,
      descricao: parsed.descricao,
      responsavel_id: parsed.responsavelId,
      cliente_id: parsed.clienteId,
      prazo: parsed.prazo,
      criado_por: profile.id,
      recorrencia_id: recorrenciaId,
      valores,
    })
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Você não tem acesso a este departamento.' };

  revalidatePath('/quadro-tarefas');
  redirect(`/quadro-tarefas?departamento=${departamentoId}`);
}

export async function cancelarRecorrencia(recorrenciaId: string, tarefaId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();
  await supabase
    .from('quadro_tarefas_recorrencias')
    .update({ ativa: false, updated_at: new Date().toISOString() })
    .eq('id', recorrenciaId);

  revalidatePath(`/quadro-tarefas/${tarefaId}/editar`);
}

export async function updateQuadroTarefa(
  id: string,
  departamentoId: string,
  recorrenciaId: string | null,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const parsed = parseQuadroTarefaForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const valores = await montarValoresCampos(supabase, departamentoId, formData);

  const { data, error } = await supabase
    .from('quadro_tarefas')
    .update({
      titulo: parsed.titulo,
      descricao: parsed.descricao,
      responsavel_id: parsed.responsavelId,
      cliente_id: parsed.clienteId,
      prazo: parsed.prazo,
      valores,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Você não tem acesso a esta tarefa.' };

  // Opt-in: também atualiza o "molde" da recorrência (título/descrição/
  // responsável/cliente), pra que as PRÓXIMAS ocorrências (ainda não geradas)
  // já nasçam com o valor novo. Não toca em ocorrências já criadas — essas
  // continuam precisando ser ajustadas uma a uma, igual antes.
  if (recorrenciaId && formData.get('atualizar_recorrencia') === 'on') {
    await supabase
      .from('quadro_tarefas_recorrencias')
      .update({
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        responsavel_id: parsed.responsavelId,
        cliente_id: parsed.clienteId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recorrenciaId);
  }

  revalidatePath('/quadro-tarefas');
  redirect(`/quadro-tarefas?departamento=${departamentoId}`);
}

export async function deleteQuadroTarefa(id: string, departamentoId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();
  const { data, error } = await supabase.from('quadro_tarefas').delete().eq('id', id).select('id');

  if (error) {
    redirect(`/quadro-tarefas/${id}/editar?erro=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/quadro-tarefas/${id}/editar?erro=${encodeURIComponent('Você não tem acesso a esta tarefa.')}`,
    );
  }

  revalidatePath('/quadro-tarefas');
  redirect(`/quadro-tarefas?departamento=${departamentoId}`);
}

export async function updateQuadroTarefaStatus(
  id: string,
  status: QuadroTarefaStatus,
  recorrenciaId: string | null,
) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();
  await supabase
    .from('quadro_tarefas')
    .update({
      status,
      concluida_em: status === 'concluida' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // Concluir uma tarefa recorrente já cria a próxima ocorrência na hora, sem
  // esperar o cron diário — vide gerar_proxima_ocorrencia().
  if (status === 'concluida' && recorrenciaId) {
    await supabase.rpc('gerar_proxima_ocorrencia', { p_recorrencia_id: recorrenciaId });
  }

  revalidatePath('/quadro-tarefas');
}
