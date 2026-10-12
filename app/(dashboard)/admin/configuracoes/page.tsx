import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ConfiguracoesSistemaForm } from '@/components/configuracoes-sistema-form';
import { getConfiguracoesSistema } from '@/lib/supabase/configuracoes-sistema';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { updateConfiguracoesSistema } from './actions';

export default async function ConfiguracoesPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const configuracoes = await getConfiguracoesSistema();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Painel Administrativo', href: '/admin' },
          { label: 'Configurações' },
        ]}
      />
      <h1 className="text-xl font-semibold">Configurações</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Tabela de Tarefas</h2>
        <div className="app-card p-6">
          <ConfiguracoesSistemaForm
            action={updateConfiguracoesSistema}
            mesesAtual={configuracoes.tarefas_meses_edicao_retroativa}
          />
        </div>
      </div>
    </div>
  );
}
