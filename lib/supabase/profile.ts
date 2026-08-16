import { createClient } from '@/lib/supabase/server';

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'usuario_final';
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  return profile as Profile | null;
}
