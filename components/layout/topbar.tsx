import { Menu } from 'lucide-react';
import { logout } from '@/app/(auth)/login/actions';

type TopbarProps = {
  nome: string;
  email: string;
  role: string;
  onMenuClick: () => void;
};

export function Topbar({ nome, email, role, onMenuClick }: TopbarProps) {
  const rotulo =
    role === 'admin' ? 'Administrador' : role === 'gerente' ? 'Gerente' : 'Usuário Final';
  const nomeExibido = nome || email;
  const inicial = nomeExibido.charAt(0).toUpperCase();

  return (
    <header className="app-glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-4 sm:gap-6 sm:px-8 sm:py-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 hover:bg-surface-muted md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-base font-bold text-accent-foreground">
          C
        </span>
        <span className="hidden text-lg font-semibold sm:inline">Contferr</span>
      </div>

      <div className="hidden flex-1 md:block">
        <h1 className="text-lg font-semibold">Olá, {nomeExibido} 👋</h1>
        <p className="text-sm text-muted">{rotulo}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:h-10 sm:w-10">
          {inicial}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-muted sm:px-4"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
