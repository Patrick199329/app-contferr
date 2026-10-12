import { redirect } from 'next/navigation';
import { AparenciaForm } from '@/components/aparencia-form';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { getConfiguracaoMarca } from '@/lib/supabase/branding';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { updateConfiguracaoMarca } from './actions';

export default async function AparenciaPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const config = await getConfiguracaoMarca();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Breadcrumbs
        items={[{ label: 'Painel Administrativo', href: '/admin' }, { label: 'Aparência' }]}
      />
      <div>
        <h1 className="text-xl font-semibold">Aparência</h1>
        <p className="text-sm text-muted">
          Cor do cabeçalho, cor de destaque do menu, logo e favicon da plataforma. Vale pra todo
          mundo, inclusive na tela de login.
        </p>
      </div>
      <div className="app-card p-6">
        <AparenciaForm
          action={updateConfiguracaoMarca}
          initialValues={{
            corCabecalho: config.cor_cabecalho,
            corMenuSelecionado: config.cor_menu_selecionado,
            corCabecalhoTabela: config.cor_cabecalho_tabela,
            logoUrl: config.logo_url,
            logoLoginUrl: config.logo_login_url,
            faviconUrl: config.favicon_url,
            nomeSite: config.nome_site,
          }}
        />
      </div>
    </div>
  );
}
