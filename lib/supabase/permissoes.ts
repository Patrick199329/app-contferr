import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

// Admin sempre tem acesso irrestrito — 'all' sinaliza isso sem precisar
// listar cada departamento. Usuário Final só vê os ids liberados para ele.
export type DepartamentosPermitidos = 'all' | string[];

export async function getDepartamentosPermitidos(): Promise<DepartamentosPermitidos> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  if (profile.role === 'admin') return 'all';

  const supabase = await createClient();
  const { data } = await supabase.from('permissoes').select('departamento_id').eq('usuario_id', profile.id);

  return (data ?? []).map((p) => p.departamento_id);
}

export function podeAcessarDepartamento(
  permitidos: DepartamentosPermitidos,
  departamentoId: string,
): boolean {
  return permitidos === 'all' || permitidos.includes(departamentoId);
}
