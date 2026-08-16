'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isValidCnpj, onlyDigits } from '@/lib/cnpj';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export type ClienteFormState = {
  error: string | null;
};

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }
}

type ParsedCliente =
  | { ok: true; razaoSocial: string; nomeFantasia: string; cnpj: string }
  | { ok: false; error: string };

function parseClienteForm(formData: FormData): ParsedCliente {
  const razaoSocial = String(formData.get('razao_social') ?? '').trim();
  const nomeFantasia = String(formData.get('nome_fantasia') ?? '').trim();
  const cnpj = onlyDigits(String(formData.get('cnpj') ?? ''));

  if (!razaoSocial || !nomeFantasia) {
    return { ok: false, error: 'Razão social e nome fantasia são obrigatórios.' };
  }
  if (!isValidCnpj(cnpj)) {
    return { ok: false, error: 'CNPJ inválido.' };
  }

  return { ok: true, razaoSocial, nomeFantasia, cnpj };
}

export async function createCliente(
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireAdmin();

  const parsed = parseClienteForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from('clientes').insert({
    razao_social: parsed.razaoSocial,
    nome_fantasia: parsed.nomeFantasia,
    cnpj: parsed.cnpj,
  });

  if (error) {
    const message = error.code === '23505' ? 'Já existe um cliente com esse CNPJ.' : error.message;
    return { error: message };
  }

  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function updateCliente(
  id: string,
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireAdmin();

  const parsed = parseClienteForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clientes')
    .update({
      razao_social: parsed.razaoSocial,
      nome_fantasia: parsed.nomeFantasia,
      cnpj: parsed.cnpj,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    const message = error.code === '23505' ? 'Já existe um cliente com esse CNPJ.' : error.message;
    return { error: message };
  }

  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function setClienteStatus(id: string, status: 'ativo' | 'inativo') {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from('clientes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/clientes');
}
