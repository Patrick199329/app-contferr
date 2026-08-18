'use client';

import {
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/clientes', label: 'Clientes', icon: Users, adminOnly: false },
  { href: '/tarefas', label: 'Tabela de Tarefas', icon: ClipboardList, adminOnly: false },
  { href: '/historico', label: 'Histórico', icon: History, adminOnly: false },
  { href: '/departamentos', label: 'Departamentos', icon: Building2, adminOnly: true },
  { href: '/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
  { href: '/admin', label: 'Painel Administrativo', icon: Settings, adminOnly: true },
] as const;

type SidebarProps = {
  isAdmin: boolean;
  open: boolean;
  onNavigate: () => void;
};

export function Sidebar({ isAdmin, open, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-2 overflow-y-auto bg-background p-4 pt-[89px] transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:bg-transparent md:pt-4 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-colors ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'bg-surface-muted/80 text-foreground/70 hover:bg-surface-muted'
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
