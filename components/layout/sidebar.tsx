'use client';

import {
  Building2,
  ClipboardList,
  DatabaseBackup,
  FileBadge,
  FileText,
  History,
  LayoutDashboard,
  ListTodo,
  ReceiptText,
  ScrollText,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DesenvolvidoPor } from '@/components/desenvolvido-por';

// requiresFlag identifica qual ferramenta opcional (por departamento) libera
// o item — null significa sempre visível (respeitado o adminOnly). Cada
// chave precisa ter um par em `flags` dentro do componente.
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false, requiresFlag: null },
  { href: '/clientes', label: 'Clientes', icon: Users, adminOnly: false, requiresFlag: null },
  { href: '/tarefas', label: 'Tabela de Tarefas', icon: ClipboardList, adminOnly: false, requiresFlag: null },
  { href: '/historico', label: 'Histórico', icon: History, adminOnly: false, requiresFlag: null },
  { href: '/quadro-tarefas', label: 'Tarefas Avulsas', icon: ListTodo, adminOnly: false, requiresFlag: 'quadroTarefas' },
  { href: '/processos', label: 'Processos', icon: FileText, adminOnly: false, requiresFlag: 'processos' },
  { href: '/alvaras', label: 'Alvarás e licenças', icon: FileBadge, adminOnly: false, requiresFlag: 'alvaras' },
  { href: '/parcelamentos', label: 'Parcelamentos', icon: ReceiptText, adminOnly: false, requiresFlag: 'parcelamentos' },
  { href: '/departamentos', label: 'Departamentos', icon: Building2, adminOnly: true, requiresFlag: null },
  { href: '/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true, requiresFlag: null },
  { href: '/admin', label: 'Painel Administrativo', icon: Settings, adminOnly: true, requiresFlag: null },
] as const;

// Só pra Innovation (ehAdminInnovation) — nunca visível pro admin do
// escritório, mesmo que ele acumule a role 'admin'.
const NAV_ITEMS_INNOVATION = [
  { href: '/admin/logs', label: 'Logs de auditoria', icon: ScrollText },
  { href: '/admin/backups', label: 'Backups', icon: DatabaseBackup },
] as const;

type SidebarProps = {
  isAdmin: boolean;
  isAdminInnovation: boolean;
  mostrarQuadroTarefas: boolean;
  mostrarProcessos: boolean;
  mostrarAlvaras: boolean;
  mostrarParcelamentos: boolean;
  open: boolean;
  onNavigate: () => void;
};

export function Sidebar({
  isAdmin,
  isAdminInnovation,
  mostrarQuadroTarefas,
  mostrarProcessos,
  mostrarAlvaras,
  mostrarParcelamentos,
  open,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const flags: Record<string, boolean> = {
    quadroTarefas: mostrarQuadroTarefas,
    processos: mostrarProcessos,
    alvaras: mostrarAlvaras,
    parcelamentos: mostrarParcelamentos,
  };
  const items = NAV_ITEMS.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.requiresFlag || flags[item.requiresFlag]),
  );

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

      {isAdminInnovation ? (
        <>
          <div className="mt-2 border-t border-border pt-2">
            <span className="px-4 text-[10px] font-medium tracking-wide text-muted uppercase">
              Innovation
            </span>
          </div>
          {NAV_ITEMS_INNOVATION.map((item) => {
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
        </>
      ) : null}

      <DesenvolvidoPor className="mt-auto pt-6 pb-2" />
    </aside>
  );
}
