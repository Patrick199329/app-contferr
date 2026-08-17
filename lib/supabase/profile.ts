import { createClient } from '@/lib/supabase/server';

export type Profile = {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'usuario_final';
  status: 'ativo' | 'inativo';
};

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
