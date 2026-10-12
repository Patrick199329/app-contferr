'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentCompetencia, shiftCompetencia } from '@/lib/competencia';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { ParcelamentoSituacao } from '@/types/parcelamento';

export type ParcelamentoFormState = {
  error: string | null;
};

type CamposParcelamento = {
  cliente_id: string;
  origem: string;
  numero_parcelamento: string | null;
  data_inicio: string;
  quantidade_parcelas: number;
  parcela_inicial: number;
  meses_tolerancia_inadimplencia: number | null;
  situacao: ParcelamentoSituacao;
  responsavel_id: string | null;
  observacoes: string | null;
};

function texto(formData: FormData, nome: string): string | null {
  return String(formData.get(nome) ?? '').trim() || null;
}

function inteiro(formData: FormData, nome: string): number | null {
  const valor = texto(formData, nome);
  if (!valor) return null;
  const n = Number.parseInt(valor, 10);
  return Number.isNaN(n) ? null : n;
}

function lerCampos(formData: FormData): CamposParcelamento | { error: string } {
  const clienteId = texto(formData, 'cliente_id');
  const origem = texto(formData, 'origem');
  if (!clienteId) return { error: 'Escolha o cliente.' };
  if (!origem) return { error: 'Informe a origem ou o portal.' };

  const quantidadeParcelas = inteiro(formData, 'quantidade_parcelas');
  if (!quantidadeParcelas || quantidadeParcelas < 1) {
    return { error: 'Informe a quantidade de parcelas.' };
  }

  const mesesTolerancia = inteiro(formData, 'meses_tolerancia_inadimplencia');
  if (mesesTolerancia !== null && mesesTolerancia < 1) {
    return { error: 'A tolerância em meses deve ser maior que zero.' };
  }

  return {
    cliente_id: clienteId,
    origem,
    numero_parcelamento: texto(formData, 'numero_parcelamento'),
    data_inicio: texto(formData, 'data_inicio') ?? new Date().toISOString().slice(0, 10),
    quantidade_parcelas: quantidadeParcelas,
    // Data de início é sempre o mês da 1ª parcela — não existe primeira
    // parcela com número diferente de 1 (ver histórico de decisão no chat).
    parcela_inicial: 1,
    meses_tolerancia_inadimplencia: mesesTolerancia,
    situacao: (texto(formData, 'situacao') ?? 'ativo') as ParcelamentoSituacao,
    responsavel_id: texto(formData, 'responsavel_id'),
    observacoes: texto(formData, 'observacoes'),
  };
}

// Gera as guias que faltam entre a "Data de início" (mês de referência do
// número inicial) e o mês corrente, todas como não enviada/não paga — quem
// marca o que de fato aconteceu em cada mês é o usuário, na lista mensal.
// Idempotente: nunca duplica um mês que já tem guia (respeita o que já foi
// editado à mão) e nunca passa de quantidade_parcelas.
async function gerarGuiasEmAberto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parcelamentoId: string,
  dataInicio: string,
  parcelaInicial: number,
  quantidadeParcelas: number,
) {
  const inicio = `${dataInicio.slice(0, 7)}-01`;
  const hoje = currentCompetencia();

  const competencias: string[] = [];
  for (let c = inicio; c <= hoje; c = shiftCompetencia(c, 1)) {
    competencias.push(c);
  }

  const { data: existentes } = await supabase
    .from('parcelamento_parcelas')
    .select('competencia')
    .eq('parcelamento_id', parcelamentoId);
  const jaExiste = new Set((existentes ?? []).map((p) => p.competencia));

  const novas = competencias
    .map((competencia, index) => ({ competencia, numero_parcela: parcelaInicial + index }))
    .filter((p) => !jaExiste.has(p.competencia) && p.numero_parcela <= quantidadeParcelas);

  if (novas.length === 0) return;

  await supabase
    .from('parcelamento_parcelas')
    .insert(novas.map((p) => ({ parcelamento_id: parcelamentoId, ...p })));
}

export async function createParcelamento(
  departamentoId: string,
  _prevState: ParcelamentoFormState,
  formData: FormData,
): Promise<ParcelamentoFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const campos = lerCampos(formData);
  if ('error' in campos) return campos;

  const supabase = await createClient();
  const { data: parcelamento, error } = await supabase
    .from('parcelamentos')
    .insert({ ...campos, departamento_id: departamentoId, criado_por: profile.id })
    .select('id')
    .single();

  if (error || !parcelamento) return { error: error?.message ?? 'Erro ao criar parcelamento.' };

  await gerarGuiasEmAberto(
    supabase,
    parcelamento.id,
    campos.data_inicio,
    campos.parcela_inicial,
    campos.quantidade_parcelas,
  );

  revalidatePath('/parcelamentos');
  redirect(`/parcelamentos?departamento=${departamentoId}`);
}

export async function updateParcelamento(
  id: string,
  departamentoId: string,
  _prevState: ParcelamentoFormState,
  formData: FormData,
): Promise<ParcelamentoFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const campos = lerCampos(formData);
  if ('error' in campos) return campos;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('parcelamentos')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Parcelamento não encontrado ou sem permissão.' };

  await gerarGuiasEmAberto(
    supabase,
    id,
    campos.data_inicio,
    campos.parcela_inicial,
    campos.quantidade_parcelas,
  );

  revalidatePath('/parcelamentos');
  redirect(`/parcelamentos?departamento=${departamentoId}`);
}

export async function deleteParcelamento(id: string, departamentoId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();
  const { data, error } = await supabase.from('parcelamentos').delete().eq('id', id).select('id');

  if (error || !data || data.length === 0) {
    redirect(
      `/parcelamentos/${id}/editar?erro=${encodeURIComponent('Não foi possível excluir o parcelamento.')}`,
    );
  }

  revalidatePath('/parcelamentos');
  redirect(`/parcelamentos?departamento=${departamentoId}`);
}

// Backfill manual e explícito de um mês anterior (ex.: parcelamento
// cadastrado no sistema em setembro, mas o cliente já vinha pagando desde
// julho fora do Contferr) — deliberadamente uma ação separada, não algo que
// dispara sozinho ao editar a data de início, pra não inventar numeração de
// parcela por conta própria: quem decide o número de cada mês é o usuário.
export async function adicionarParcelaRetroativa(
  parcelamentoId: string,
  _prevState: ParcelamentoFormState,
  formData: FormData,
): Promise<ParcelamentoFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const competenciaMes = String(formData.get('competencia') ?? '').trim();
  if (!/^\d{4}-\d{2}$/.test(competenciaMes)) return { error: 'Informe o mês da guia.' };
  const competencia = `${competenciaMes}-01`;

  const numeroParcela = inteiro(formData, 'numero_parcela');
  if (!numeroParcela || numeroParcela < 1) return { error: 'Informe o número da parcela.' };

  const supabase = await createClient();
  const { error } = await supabase.from('parcelamento_parcelas').insert({
    parcelamento_id: parcelamentoId,
    competencia,
    numero_parcela: numeroParcela,
    guia_enviada: formData.get('guia_enviada') === 'on',
    pago: formData.get('pago') === 'on',
  });

  if (error) {
    return {
      error: error.code === '23505' ? 'Já existe uma guia cadastrada para esse mês.' : error.message,
    };
  }

  revalidatePath(`/parcelamentos/${parcelamentoId}/editar`);
  revalidatePath('/parcelamentos');
  return { error: null };
}

// Toggle rápido de "guia enviada" / "pago" direto na lista mensal — sem RPC
// dedicada, pois ao contrário das etapas de Processos não há regra de
// negócio pra travar (a regra de tolerância de inadimplência só é avaliada
// uma vez por mês, na virada — ver migration da virada de parcelamentos).
export async function toggleParcelamentoParcela(
  parcelaId: string,
  campo: 'guia_enviada' | 'pago',
  valor: boolean,
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const hoje = new Date().toISOString().slice(0, 10);
  const camposData: Record<string, string | boolean | null> = {
    [campo]: valor,
    updated_at: new Date().toISOString(),
  };
  if (campo === 'guia_enviada') camposData.data_envio = valor ? hoje : null;
  if (campo === 'pago') camposData.data_pagamento = valor ? hoje : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('parcelamento_parcelas')
    .update(camposData)
    .eq('id', parcelaId)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Guia não encontrada ou sem permissão.' };

  revalidatePath('/parcelamentos');
  return { error: null };
}
