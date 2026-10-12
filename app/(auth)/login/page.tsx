import { DesenvolvidoPor } from '@/components/desenvolvido-por';
import { LoginForm } from '@/components/login-form';
import { Logo } from '@/components/logo';
import { getConfiguracaoMarca } from '@/lib/supabase/branding';

type LoginPageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { erro } = await searchParams;
  const config = await getConfiguracaoMarca();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <Logo logoUrl={config.logo_login_url ?? config.logo_url} size="md" />
      <div className="app-card flex w-full max-w-sm flex-col gap-4 p-8">
        {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}
        <LoginForm />
      </div>
      <DesenvolvidoPor />
    </main>
  );
}
