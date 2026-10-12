import { createClient } from '@/lib/supabase/server';
import { CONFIGURACAO_MARCA_PADRAO, type ConfiguracaoMarca } from '@/types/branding';

// Lida tanto de /login (sem sessão) quanto de dentro do dashboard — a RLS
// de configuracoes_marca libera select pra anon e authenticated.
export async function getConfiguracaoMarca(): Promise<ConfiguracaoMarca> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('configuracoes_marca')
    .select('*')
    .eq('id', true)
    .single<ConfiguracaoMarca>();

  return data ?? CONFIGURACAO_MARCA_PADRAO;
}
