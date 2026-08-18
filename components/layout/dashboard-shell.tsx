'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

type DashboardShellProps = {
  nome: string;
  email: string;
  role: string;
  isAdmin: boolean;
  children: ReactNode;
};

export function DashboardShell({ nome, email, role, isAdmin, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar nome={nome} email={email} role={role} onMenuClick={() => setMenuOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isAdmin={isAdmin} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        {menuOpen ? (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
          />
        ) : null}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
