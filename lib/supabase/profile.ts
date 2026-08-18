import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'gerente' | 'usuario_final';

export type Profile = {
  id: string;
  email: string;
  nome: string;
  role: Role;
  status: 'ativo' | 'inativo';
};

// Admin e Gerente podem criar/editar clientes (Gerente só os vinculados a
// departamentos que ele gerencia — a RLS de `clientes`/`cliente_departamentos`
// já garante isso; esta função é só para decidir o que mostrar na UI).
export function podeGerenciarClientes(profile: Profile | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'gerente';
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, nome, role, status')
    .eq('id', user.id)
    .single();

  return profile as Profile | null;
}
