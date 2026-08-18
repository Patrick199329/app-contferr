import { Building2, RefreshCw, UserCog } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/profile';

const SECOES = [
  {
    href: '/departamentos',
    label: 'Departamentos e colunas',
    desc: 'Criar, renomear e configurar departamentos e suas colunas.',
    icon: Building2,
    tint: 'peach' as const,
  },
  {
    href: '/usuarios',
    label: 'Usuários e permissões',
    desc: 'Gerenciar contas, perfis e acesso por departamento.',
    icon: UserCog,
    tint: 'lavender' as const,
  },
  {
    href: '/admin/virada',
    label: 'Virada Mensal',
    desc: 'Acompanhar e forçar a virada de competência.',
    icon: RefreshCw,
    tint: 'mint' as const,
  },
];

const TINT_BG = {
  peach: 'bg-tint-peach-bg',
  lavender: 'bg-tint-lavender-bg',
  mint: 'bg-tint-mint-bg',
};

const TINT_ICON = {
  peach: 'text-tint-peach-icon',
  lavender: 'text-tint-lavender-icon',
  mint: 'text-tint-mint-icon',
};

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Painel Administrativo</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {SECOES.map((secao) => {
          const Icon = secao.icon;
          return (
            <Link
              key={secao.href}
              href={secao.href}
              className={`flex flex-col gap-4 rounded-3xl border border-white/50 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_-10px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 ${TINT_BG[secao.tint]}`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 ${TINT_ICON[secao.tint]}`}
              >
                <Icon size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="font-semibold text-foreground">{secao.label}</p>
                <p className="text-sm text-foreground/70">{secao.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
