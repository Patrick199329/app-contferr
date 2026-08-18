import { redirect } from 'next/navigation';
import { ClienteForm } from '@/components/cliente-form';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { createCliente } from '../actions';

export default async function NovoClientePage() {
  const profile = await getCurrentProfile();
  if (!podeGerenciarClientes(profile)) {
    redirect('/clientes');
  }

  const supabase = await createClient();

  let departamentosDisponiveis: { id: string; nome: string }[] = [];

  if (profile?.role === 'admin') {
    const { data } = await supabase
      .from('departamentos')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('ordem');
    departamentosDisponiveis = data ?? [];
  } else {
    const { data: permissoes } = await supabase
      .from('permissoes')
      .select('departamento_id')
      .eq('usuario_id', profile!.id);
    const ids = (permissoes ?? []).map((p) => p.departamento_id);
    if (ids.length > 0) {
      const { data } = await supabase
        .from('departamentos')
        .select('id, nome')
        .in('id', ids)
        .eq('status', 'ativo')
        .order('ordem');
      departamentosDisponiveis = data ?? [];
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Novo cliente</h1>
      <div className="app-card p-6">
        <ClienteForm
          action={createCliente}
          departamentosDisponiveis={departamentosDisponiveis}
          submitLabel="Criar cliente"
        />
      </div>
    </div>
  );
}
