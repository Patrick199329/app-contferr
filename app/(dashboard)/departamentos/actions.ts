'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { COLUNA_TIPOS_COM_OPCOES, type ColunaTipo } from '@/types/departamento';

export type FormState = {
  error: string | null;
};

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }
}

export async function createDepartamento(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) return { error: 'Informe o nome do departamento.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('departamentos')
    .select('*', { count: 'exact', head: true });

  const { error } = await supabase.from('departamentos').insert({ nome, ordem: count ?? 0 });
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

  if (!nome) return { error: 'Informe o nome da coluna.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('colunas')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamentoId);

  const { data: coluna, error } = await supabase
    .from('colunas')
    .insert({ departamento_id: departamentoId, nome, tipo, ordem: count ?? 0 })
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
