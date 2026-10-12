import { createClient } from '@/lib/supabase/server';
import type { QuadroTarefaCampo, QuadroTarefaCampoOpcao } from '@/types/quadro-tarefa';

// Campos ativos de um departamento nas Tarefas Avulsas, com as opções de
// cada campo tipo lista_opcoes/status já agrupadas por campo_id — usado nos
// formulários de criar/editar tarefa e na listagem.
export async function getQuadroTarefasCampos(departamentoId: string) {
  const supabase = await createClient();

  const { data: campos } = await supabase
    .from('quadro_tarefas_campos')
    .select('*')
    .eq('departamento_id', departamentoId)
    .eq('status', 'ativo')
    .order('ordem')
    .returns<QuadroTarefaCampo[]>();

  const camposList = campos ?? [];
  const campoIds = camposList.map((c) => c.id);

  const { data: opcoes } =
    campoIds.length > 0
      ? await supabase
          .from('quadro_tarefas_campos_opcoes')
          .select('*')
          .in('campo_id', campoIds)
          .eq('status', 'ativo')
          .order('ordem')
          .returns<QuadroTarefaCampoOpcao[]>()
      : { data: [] as QuadroTarefaCampoOpcao[] };

  const opcoesPorCampo: Record<string, string[]> = {};
  for (const opcao of opcoes ?? []) {
    (opcoesPorCampo[opcao.campo_id] ??= []).push(opcao.valor);
  }

  return { campos: camposList, opcoesPorCampo };
}
