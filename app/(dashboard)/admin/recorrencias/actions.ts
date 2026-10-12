'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export async function forcarGeracaoRecorrencias() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }

  const supabase = await createClient();
  await supabase.rpc('gerar_tarefas_recorrentes', { p_executado_por: profile.id });

  revalidatePath('/admin/recorrencias');
}
