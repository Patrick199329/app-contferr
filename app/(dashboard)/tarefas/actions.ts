'use server';

import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export async function updateTarefaValor(
  clienteId: string,
  departamentoId: string,
  competencia: string,
  colunaId: string,
  valor: string,
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error('Não autorizado.');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('upsert_tarefa_valor', {
    p_cliente_id: clienteId,
    p_departamento_id: departamentoId,
    p_competencia: competencia,
    p_coluna_id: colunaId,
    p_valor: valor,
    p_user_id: profile.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}
