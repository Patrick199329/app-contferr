'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isValidCnpj, onlyDigits } from '@/lib/cnpj';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export type ClienteFormState = {
  error: string | null;
};

async function requireGerenciador() {
  const profile = await getCurrentProfile();
  if (!podeGerenciarClientes(profile)) {
    throw new Error('Não autorizado.');
  }
}

type ParsedCliente =
  | { ok: true; razaoSocial: string; nomeFantasia: string; cnpj: string; departamentoIds: string[] }
  | { ok: false; error: string };

function parseClienteForm(formData: FormData): ParsedCliente {
  const razaoSocial = String(formData.get('razao_social') ?? '').trim();
  const nomeFantasia = String(formData.get('nome_fantasia') ?? '').trim();
  const cnpj = onlyDigits(String(formData.get('cnpj') ?? ''));
  const departamentoIds = formData.getAll('departamentos').map(String);

  if (!razaoSocial || !nomeFantasia) {
    return { ok: false, error: 'Razão social e nome fantasia são obrigatórios.' };
  }
  if (!isValidCnpj(cnpj)) {
    return { ok: false, error: 'CNPJ inválido.' };
  }

  return { ok: true, razaoSocial, nomeFantasia, cnpj, departamentoIds };
}

export async function createCliente(
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireGerenciador();

  const parsed = parseClienteForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({
      razao_social: parsed.razaoSocial,
      nome_fantasia: parsed.nomeFantasia,
      cnpj: parsed.cnpj,
    })
    .select('id')
    .single();

  if (error || !cliente) {
    const message =
      error?.code === '23505' ? 'Já existe um cliente com esse CNPJ.' : error?.message;
    return { error: message ?? 'Erro ao criar cliente.' };
  }

  if (parsed.departamentoIds.length > 0) {
    await supabase.from('cliente_departamentos').insert(
      parsed.departamentoIds.map((departamentoId) => ({
        cliente_id: cliente.id,
        departamento_id: departamentoId,
      })),
    );
  }

  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function updateCliente(
  id: string,
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireGerenciador();

  const parsed = parseClienteForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clientes')
    .update({
      razao_social: parsed.razaoSocial,
      nome_fantasia: parsed.nomeFantasia,
      cnpj: parsed.cnpj,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');

  if (error) {
    const message = error.code === '23505' ? 'Já existe um cliente com esse CNPJ.' : error.message;
    return { error: message };
  }

  // RLS bloqueia silenciosamente (0 linhas afetadas, sem erro) quando um
  // Gerente tenta editar cliente fora dos departamentos que ele gerencia.
  if (!data || data.length === 0) {
    return { error: 'Você não tem permissão para editar este cliente.' };
  }

  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function setClienteStatus(id: string, status: 'ativo' | 'inativo') {
  await requireGerenciador();

  const supabase = await createClient();
  await supabase
    .from('clientes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/clientes');
}

export async function linkClienteDepartamento(clienteId: string, departamentoId: string) {
  await requireGerenciador();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cliente_departamentos')
    .insert({ cliente_id: clienteId, departamento_id: departamentoId })
    .select('id');

  if (error) {
    redirect(`/clientes/${clienteId}/editar?erro=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/clientes/${clienteId}/editar?erro=${encodeURIComponent('Você não gerencia este departamento.')}`,
    );
  }

  revalidatePath(`/clientes/${clienteId}/editar`);
  revalidatePath('/clientes');
}

export async function unlinkClienteDepartamento(clienteId: string, departamentoId: string) {
  await requireGerenciador();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cliente_departamentos')
    .delete()
    .eq('cliente_id', clienteId)
    .eq('departamento_id', departamentoId)
    .select('id');

  if (error) {
    redirect(`/clientes/${clienteId}/editar?erro=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/clientes/${clienteId}/editar?erro=${encodeURIComponent('Você não gerencia este departamento.')}`,
    );
  }

  revalidatePath(`/clientes/${clienteId}/editar`);
  revalidatePath('/clientes');
}
