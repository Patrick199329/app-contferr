'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type FormState = {
  error: string | null;
};

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }
}

export async function createUsuario(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const senha = String(formData.get('senha') ?? '');
  const role = String(formData.get('role') ?? 'usuario_final') as 'admin' | 'usuario_final';

  if (!nome || !email) return { error: 'Nome e e-mail são obrigatórios.' };
  if (senha.length < 8) return { error: 'A senha deve ter pelo menos 8 caracteres.' };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (error) {
    return { error: error.message };
  }

  if (role === 'admin') {
    const supabase = await createClient();
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }

  revalidatePath('/usuarios');
  redirect('/usuarios');
}

export async function updateUsuario(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const nome = String(formData.get('nome') ?? '').trim();
  const role = String(formData.get('role') ?? 'usuario_final') as 'admin' | 'usuario_final';

  if (!nome) return { error: 'Informe o nome.' };

  if (role !== 'admin') {
    const supabase = await createClient();
    const { data: alvo } = await supabase.from('profiles').select('role').eq('id', id).single();
    if (alvo?.role === 'admin') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'ativo');
      if ((count ?? 0) <= 1) {
        return { error: 'Não é possível rebaixar o último Administrador ativo.' };
      }
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ nome, role }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/usuarios');
  redirect('/usuarios');
}

export async function setUsuarioStatus(id: string, status: 'ativo' | 'inativo') {
  await requireAdmin();

  const supabase = await createClient();

  if (status === 'inativo') {
    const { data: alvo } = await supabase.from('profiles').select('role').eq('id', id).single();
    if (alvo?.role === 'admin') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'ativo');
      if ((count ?? 0) <= 1) {
        redirect(
          `/usuarios?erro=${encodeURIComponent('Não é possível desativar o último Administrador ativo.')}`,
        );
      }
    }
  }

  const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
  if (error) {
    redirect(`/usuarios?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/usuarios');
}
