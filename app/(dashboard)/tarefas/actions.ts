'use server';

import { currentCompetencia, shiftCompetencia } from '@/lib/competencia';
import { getConfiguracoesSistema } from '@/lib/supabase/configuracoes-sistema';
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

  // Reforça no servidor o limite configurado em Configurações — a interface
  // já não deixa navegar pra fora dessa janela, mas isso não pode depender
  // só do que a tela mostra.
  const { tarefas_meses_edicao_retroativa: mesesRetroativos } = await getConfiguracoesSistema();
  const competenciaMinima = shiftCompetencia(currentCompetencia(), -mesesRetroativos);
  if (competencia < competenciaMinima || competencia > currentCompetencia()) {
    throw new Error('Esta competência está fora da janela de edição permitida.');
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
