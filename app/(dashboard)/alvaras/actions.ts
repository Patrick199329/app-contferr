'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { LicencaRecorrencia, LicencaSituacao } from '@/types/licenca';

export type LicencaFormState = {
  error: string | null;
};

type CamposLicenca = {
  cliente_id: string;
  tipo: string;
  orgao_emissor: string | null;
  numero: string | null;
  municipio: string | null;
  uf: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  situacao: LicencaSituacao;
  responsavel_id: string | null;
  recorrencia: LicencaRecorrencia;
  taxa_mes: number | null;
  taxa_dia: number | null;
  valor_estimado: number | null;
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

function lerCampos(formData: FormData): CamposLicenca | { error: string } {
  const clienteId = texto(formData, 'cliente_id');
  const tipo = texto(formData, 'tipo');
  if (!clienteId) return { error: 'Escolha o cliente.' };
  if (!tipo) return { error: 'Informe o tipo da licença ou alvará.' };

  const uf = texto(formData, 'uf')?.toUpperCase() ?? null;
  if (uf && !/^[A-Z]{2}$/.test(uf)) return { error: 'UF deve ter 2 letras (ex.: MG).' };

  const dataEmissao = texto(formData, 'data_emissao');
  const dataVencimento = texto(formData, 'data_vencimento');
  if (dataEmissao && dataVencimento && dataVencimento < dataEmissao) {
    return { error: 'O vencimento não pode ser anterior à emissão.' };
  }

  const recorrencia = (texto(formData, 'recorrencia') ?? 'anual') as LicencaRecorrencia;
  const anual = recorrencia === 'anual';

  const taxaMes = anual ? inteiro(formData, 'taxa_mes') : null;
  const taxaDia = anual ? inteiro(formData, 'taxa_dia') : null;
  if (taxaMes !== null && (taxaMes < 1 || taxaMes > 12)) return { error: 'Mês da taxa inválido.' };
  if (taxaDia !== null && (taxaDia < 1 || taxaDia > 31)) return { error: 'Dia da taxa inválido.' };

  const valorTexto = texto(formData, 'valor_estimado');
  let valorEstimado: number | null = null;
  if (valorTexto) {
    valorEstimado = Number(valorTexto.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(valorEstimado) || valorEstimado < 0) return { error: 'Valor estimado inválido.' };
  }

  return {
    cliente_id: clienteId,
    tipo,
    orgao_emissor: texto(formData, 'orgao_emissor'),
    numero: texto(formData, 'numero'),
    municipio: texto(formData, 'municipio'),
    uf,
    data_emissao: dataEmissao,
    data_vencimento: dataVencimento,
    situacao: (texto(formData, 'situacao') ?? 'ativa') as LicencaSituacao,
    responsavel_id: texto(formData, 'responsavel_id'),
    recorrencia,
    taxa_mes: taxaMes,
    taxa_dia: taxaDia,
    valor_estimado: anual ? valorEstimado : null,
    observacoes: texto(formData, 'observacoes'),
  };
}

export async function createLicenca(
  departamentoId: string,
  _prevState: LicencaFormState,
  formData: FormData,
): Promise<LicencaFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const campos = lerCampos(formData);
  if ('error' in campos) return campos;

  const supabase = await createClient();
  const { error } = await supabase
    .from('licencas')
    .insert({ ...campos, departamento_id: departamentoId, criado_por: profile.id });

  if (error) return { error: error.message };

  revalidatePath('/alvaras');
  redirect(`/alvaras?departamento=${departamentoId}`);
}

export async function updateLicenca(
  id: string,
  departamentoId: string,
  _prevState: LicencaFormState,
  formData: FormData,
): Promise<LicencaFormState> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const campos = lerCampos(formData);
  if ('error' in campos) return campos;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('licencas')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Licença não encontrada ou sem permissão.' };

  revalidatePath('/alvaras');
  redirect(`/alvaras?departamento=${departamentoId}`);
}

export async function deleteLicenca(id: string, departamentoId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('Não autorizado.');

  const supabase = await createClient();
  const { data, error } = await supabase.from('licencas').delete().eq('id', id).select('id');

  if (error || !data || data.length === 0) {
    redirect(`/alvaras/${id}/editar?erro=${encodeURIComponent('Não foi possível excluir a licença.')}`);
  }

  revalidatePath('/alvaras');
  redirect(`/alvaras?departamento=${departamentoId}`);
}
