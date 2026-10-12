'use client';

import { useState, type ReactNode } from 'react';
import type { FraseMotivacional } from '@/lib/frase-motivacional';
import type { ClientePendente, QuadroPendencia } from '@/lib/indicadores';
import type { Role } from '@/lib/supabase/profile';
import { AlertaPendenciasModal } from './alerta-pendencias-modal';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

type DashboardShellProps = {
  logoUrl: string | null;
  frase: FraseMotivacional;
  isAdmin: boolean;
  isAdminInnovation: boolean;
  mostrarQuadroTarefas: boolean;
  mostrarProcessos: boolean;
  mostrarAlvaras: boolean;
  mostrarParcelamentos: boolean;
  pendenciasQuadroHojeItens: QuadroPendencia[];
  clientesPendentes: ClientePendente[];
  usuario: { nome: string; email: string; role: Role };
  children: ReactNode;
};

export function DashboardShell({
  logoUrl,
  frase,
  isAdmin,
  isAdminInnovation,
  mostrarQuadroTarefas,
  mostrarProcessos,
  mostrarAlvaras,
  mostrarParcelamentos,
  pendenciasQuadroHojeItens,
  clientesPendentes,
  usuario,
  children,
}: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AlertaPendenciasModal itens={pendenciasQuadroHojeItens} />
      <Topbar
        logoUrl={logoUrl}
        frase={frase}
        pendenciasQuadroHojeItens={pendenciasQuadroHojeItens}
        clientesPendentes={clientesPendentes}
        usuario={usuario}
        onMenuClick={() => setMenuOpen((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isAdmin={isAdmin}
          isAdminInnovation={isAdminInnovation}
          mostrarQuadroTarefas={mostrarQuadroTarefas}
          mostrarProcessos={mostrarProcessos}
          mostrarAlvaras={mostrarAlvaras}
          mostrarParcelamentos={mostrarParcelamentos}
          open={menuOpen}
          onNavigate={() => setMenuOpen(false)}
        />
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
