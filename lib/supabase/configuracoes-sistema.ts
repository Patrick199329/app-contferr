import { createClient } from '@/lib/supabase/server';
import { CONFIGURACOES_SISTEMA_PADRAO, type ConfiguracoesSistema } from '@/types/configuracoes-sistema';

export async function getConfiguracoesSistema(): Promise<ConfiguracoesSistema> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('configuracoes_sistema')
    .select('*')
    .eq('id', true)
    .single<ConfiguracoesSistema>();

  return data ?? CONFIGURACOES_SISTEMA_PADRAO;
}
