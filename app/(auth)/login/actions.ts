'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type LoginState = {
  error: string | null;
};

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Informe e-mail e senha.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'E-mail ou senha inválidos.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .single();

  if (profile?.status === 'inativo') {
    await supabase.auth.signOut();
    return { error: 'Este usuário foi desativado. Fale com o Administrador.' };
  }

  await supabase.rpc('registrar_evento_sessao', { p_tipo: 'login' });

  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  // Precisa rodar antes do signOut — depois disso auth.uid() não resolve
  // mais, e a função que grava o evento não saberia de quem é a saída.
  await supabase.rpc('registrar_evento_sessao', { p_tipo: 'logout' });
  await supabase.auth.signOut();
  redirect('/login');
}
