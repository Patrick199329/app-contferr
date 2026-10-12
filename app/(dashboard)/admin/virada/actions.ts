'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export async function forcarVirada() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }

  const supabase = await createClient();
  await supabase.rpc('executar_virada_mensal', {
    p_competencia: null,
    p_executado_por: profile.id,
  });

  revalidatePath('/admin/virada');
}

export async function forcarViradaParcelamentos() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }

  const supabase = await createClient();
  await supabase.rpc('executar_virada_parcelamentos', {
    p_competencia: null,
    p_executado_por: profile.id,
  });

  revalidatePath('/admin/virada');
  revalidatePath('/parcelamentos');
}
