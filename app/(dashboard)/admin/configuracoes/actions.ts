'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export type FormState = {
  error: string | null;
  sucesso?: boolean;
};

export async function updateConfiguracoesSistema(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }

  const valor = Number.parseInt(String(formData.get('tarefas_meses_edicao_retroativa') ?? ''), 10);
  if (Number.isNaN(valor) || valor < 0) {
    return { error: 'Informe um número de meses válido (0 ou mais).' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('configuracoes_sistema')
    .update({
      tarefas_meses_edicao_retroativa: valor,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);

  if (error) return { error: error.message };

  revalidatePath('/admin/configuracoes');
  revalidatePath('/tarefas');
  return { error: null, sucesso: true };
}
