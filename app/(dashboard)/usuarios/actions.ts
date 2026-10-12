'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile, type Role } from '@/lib/supabase/profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type FormState = {
  error: string | null;
};

export type ResetSenhaFormState = {
  error: string | null;
  sucesso?: boolean;
};

export type EditarEmailFormState = {
  error: string | null;
  sucesso?: boolean;
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
  const role = String(formData.get('role') ?? 'usuario_final') as Role;
  const departamentoIds = formData.getAll('departamentos').map(String);

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

  const supabase = await createClient();

  if (role !== 'usuario_final') {
    await supabase.from('profiles').update({ role }).eq('id', data.user.id);
  }

  if (role !== 'admin' && departamentoIds.length > 0) {
    await supabase.from('permissoes').insert(
      departamentoIds.map((departamentoId) => ({
        usuario_id: data.user.id,
        departamento_id: departamentoId,
      })),
    );
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
  const role = String(formData.get('role') ?? 'usuario_final') as Role;
  const departamentoIds = formData.getAll('departamentos').map(String);

  if (!nome) return { error: 'Informe o nome.' };

  const supabase = await createClient();

  if (role !== 'admin') {
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

  const { error } = await supabase.from('profiles').update({ nome, role }).eq('id', id);
  if (error) return { error: error.message };

  // Sincroniza os departamentos/subdepartamentos vinculados — migrar alguém
  // de departamento é só desmarcar um e marcar outro aqui, num passo só, sem
  // precisar passar pela tela de Permissões à parte.
  if (role === 'admin') {
    await supabase.from('permissoes').delete().eq('usuario_id', id);
  } else {
    const { data: atuais } = await supabase
      .from('permissoes')
      .select('departamento_id')
      .eq('usuario_id', id);
    const idsAtuais = new Set((atuais ?? []).map((p) => p.departamento_id));
    const idsNovos = new Set(departamentoIds);

    const paraRemover = [...idsAtuais].filter((d) => !idsNovos.has(d));
    const paraAdicionar = [...idsNovos].filter((d) => !idsAtuais.has(d));

    if (paraRemover.length > 0) {
      await supabase
        .from('permissoes')
        .delete()
        .eq('usuario_id', id)
        .in('departamento_id', paraRemover);
    }
    if (paraAdicionar.length > 0) {
      await supabase
        .from('permissoes')
        .insert(paraAdicionar.map((departamentoId) => ({ usuario_id: id, departamento_id: departamentoId })));
    }
  }

  revalidatePath('/usuarios');
  redirect('/usuarios');
}

export async function resetUsuarioSenha(
  id: string,
  _prevState: ResetSenhaFormState,
  formData: FormData,
): Promise<ResetSenhaFormState> {
  await requireAdmin();

  const novaSenha = String(formData.get('senha') ?? '');
  if (novaSenha.length < 8) return { error: 'A senha deve ter pelo menos 8 caracteres.' };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(id, { password: novaSenha });
  if (error) return { error: error.message };

  return { error: null, sucesso: true };
}

// Corrige erro de digitação no e-mail (login é feito por e-mail no
// Supabase Auth, então precisa atualizar tanto auth.users quanto o espelho
// em profiles.email, que não é sincronizado automaticamente após o
// cadastro — só na criação, via trigger).
export async function updateUsuarioEmail(
  id: string,
  _prevState: EditarEmailFormState,
  formData: FormData,
): Promise<EditarEmailFormState> {
  await requireAdmin();

  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Informe o e-mail.' };

  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(id, { email });
  if (authError) return { error: authError.message };

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ email }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath(`/usuarios/${id}/editar`);
  revalidatePath('/usuarios');
  return { error: null, sucesso: true };
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

export async function toggleDepartamentoPermissao(
  usuarioId: string,
  departamentoId: string,
  conceder: boolean,
) {
  await requireAdmin();

  const supabase = await createClient();

  if (conceder) {
    await supabase
      .from('permissoes')
      .insert({ usuario_id: usuarioId, departamento_id: departamentoId });
  } else {
    await supabase
      .from('permissoes')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('departamento_id', departamentoId);
  }

  revalidatePath(`/usuarios/${usuarioId}/permissoes`);
}
