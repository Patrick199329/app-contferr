'use client';

import { AlertCircle, Menu, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { logout } from '@/app/(auth)/login/actions';
import { Logo } from '@/components/logo';
import type { FraseMotivacional } from '@/lib/frase-motivacional';
import type { ClientePendente, QuadroPendencia, UrgenciaQuadro } from '@/lib/indicadores';
import type { Role } from '@/lib/supabase/profile';

const MAX_ITENS_POPOVER = 8;

const URGENCIA_LABEL: Record<UrgenciaQuadro, string> = {
  atrasada: 'Atrasada',
  hoje: 'Hoje',
  proximos_7_dias: 'Em breve',
};

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  usuario_final: 'Usuário Final',
};

type TopbarProps = {
  logoUrl: string | null;
  frase: FraseMotivacional;
  pendenciasQuadroHojeItens: QuadroPendencia[];
  clientesPendentes: ClientePendente[];
  usuario: { nome: string; email: string; role: Role };
  onMenuClick: () => void;
};

export function Topbar({
  logoUrl,
  frase,
  pendenciasQuadroHojeItens,
  clientesPendentes,
  usuario,
  onMenuClick,
}: TopbarProps) {
  const [aberto, setAberto] = useState<'quadro' | 'tabela' | 'usuario' | null>(null);
  const quadroRef = useRef<HTMLDivElement>(null);
  const tabelaRef = useRef<HTMLDivElement>(null);
  const usuarioRef = useRef<HTMLDivElement>(null);
  const clientesPendentesCount = new Set(clientesPendentes.map((c) => c.clienteId)).size;
  const inicial = (usuario.nome || usuario.email).trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(e: MouseEvent) {
      const ref = aberto === 'quadro' ? quadroRef : aberto === 'tabela' ? tabelaRef : usuarioRef;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(null);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [aberto]);

  return (
    <header className="app-glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-4 sm:gap-6 sm:px-8 sm:py-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 hover:bg-surface-muted hover:text-foreground md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <Logo logoUrl={logoUrl} size="sm" />
      </div>

      <div className="hidden min-w-0 flex-1 md:block">
        <h1 className="text-lg font-semibold">Gerenciador de tarefas</h1>
        <p className="truncate text-sm opacity-70 italic">
          “{frase.texto}”{frase.autor ? ` — ${frase.autor}` : ''}
        </p>
      </div>

      {/* Só aparece quando há alguma coisa que pede atenção — sem poluir o
          cabeçalho com "0" à toa. */}
      <div className="hidden items-center gap-2 lg:flex">
        {pendenciasQuadroHojeItens.length > 0 ? (
          <div className="relative" ref={quadroRef}>
            <button
              type="button"
              onClick={() => setAberto((v) => (v === 'quadro' ? null : 'quadro'))}
              className="flex items-center gap-1.5 rounded-full bg-status-inactive/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-status-inactive hover:bg-status-inactive/20"
            >
              <AlertCircle size={14} strokeWidth={2.5} />
              {pendenciasQuadroHojeItens.length} pendente
              {pendenciasQuadroHojeItens.length === 1 ? '' : 's'}
            </button>
            {aberto === 'quadro' ? (
              <div className="absolute top-full right-0 z-40 mt-2 w-80 rounded-xl border border-border bg-surface p-3 text-foreground shadow-lg">
                <p className="mb-2 text-xs font-medium text-muted uppercase">Tarefas Avulsas</p>
                <ul className="flex flex-col gap-2">
                  {pendenciasQuadroHojeItens.slice(0, MAX_ITENS_POPOVER).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/quadro-tarefas/${item.id}/editar`}
                        onClick={() => setAberto(null)}
                        className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted"
                      >
                        <span
                          className={
                            item.urgencia === 'atrasada' ? 'text-status-inactive' : 'text-status-pending'
                          }
                        >
                          {URGENCIA_LABEL[item.urgencia]}
                        </span>{' '}
                        · #{item.numero} {item.titulo}
                        <span className="block text-xs text-muted">
                          {item.departamentoNome}
                          {item.clienteNome ? ` · ${item.clienteNome}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {pendenciasQuadroHojeItens.length > MAX_ITENS_POPOVER ? (
                  <p className="mt-2 text-xs text-muted">
                    +{pendenciasQuadroHojeItens.length - MAX_ITENS_POPOVER} outras
                  </p>
                ) : null}
                <Link
                  href="/quadro-tarefas"
                  onClick={() => setAberto(null)}
                  className="mt-3 block rounded-lg border border-border px-3 py-1.5 text-center text-sm font-medium hover:bg-surface-muted"
                >
                  Ver mais
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
        {clientesPendentes.length > 0 ? (
          <div className="relative" ref={tabelaRef}>
            <button
              type="button"
              onClick={() => setAberto((v) => (v === 'tabela' ? null : 'tabela'))}
              className="flex items-center gap-1.5 rounded-full bg-status-pending/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-status-pending hover:bg-status-pending/20"
            >
              <Users size={14} strokeWidth={2.5} />
              {clientesPendentesCount} {clientesPendentesCount === 1 ? 'cliente' : 'clientes'}
            </button>
            {aberto === 'tabela' ? (
              <div className="absolute top-full right-0 z-40 mt-2 w-80 rounded-xl border border-border bg-surface p-3 text-foreground shadow-lg">
                <p className="mb-2 text-xs font-medium text-muted uppercase">Tabela de Tarefas</p>
                <ul className="flex flex-col gap-2">
                  {clientesPendentes.slice(0, MAX_ITENS_POPOVER).map((c) => (
                    <li key={`${c.clienteId}-${c.departamentoId}`}>
                      <Link
                        href={`/tarefas?departamento=${c.departamentoId}`}
                        onClick={() => setAberto(null)}
                        className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted"
                      >
                        {c.clienteNome}
                        <span className="block text-xs text-muted">{c.departamentoNome}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {clientesPendentes.length > MAX_ITENS_POPOVER ? (
                  <p className="mt-2 text-xs text-muted">
                    +{clientesPendentes.length - MAX_ITENS_POPOVER} outros
                  </p>
                ) : null}
                <Link
                  href="/tarefas"
                  onClick={() => setAberto(null)}
                  className="mt-3 block rounded-lg border border-border px-3 py-1.5 text-center text-sm font-medium hover:bg-surface-muted"
                >
                  Ver mais
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative" ref={usuarioRef}>
        <button
          type="button"
          onClick={() => setAberto((v) => (v === 'usuario' ? null : 'usuario'))}
          aria-label="Menu do usuário"
          // Usa currentColor (herdado do texto do cabeçalho, já calculado
          // pra contrastar com a cor de fundo escolhida pelo admin em
          // Aparência) em vez de --accent — senão, se cor do cabeçalho e cor
          // de destaque do menu ficarem parecidas, o avatar some.
          className="flex h-10 w-10 items-center justify-center rounded-full border border-current/25 bg-current/15 text-sm font-semibold hover:bg-current/25"
        >
          {inicial}
        </button>
        {aberto === 'usuario' ? (
          <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-surface p-3 text-foreground shadow-lg">
            <p className="truncate text-sm font-medium">{usuario.nome || usuario.email}</p>
            <p className="text-xs text-muted">{ROLE_LABEL[usuario.role]}</p>
            <form action={logout} className="mt-3">
              <button
                type="submit"
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                Sair
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
