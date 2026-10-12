'use client';

import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { QuadroPendencia } from '@/lib/indicadores';

type AlertaPendenciasModalProps = {
  itens: QuadroPendencia[];
};

const URGENCIA_LABEL: Record<string, string> = {
  atrasada: 'Atrasada',
  hoje: 'Vence hoje',
};

// Chave de sessão (não localStorage) — pede atenção de novo a cada login,
// mas não fica reabrindo a cada navegação dentro da mesma sessão depois que
// o usuário já fechou.
const CHAVE_SESSAO = 'contferr-alerta-pendencias-fechado';

// Lê o sessionStorage direto no render (via useSyncExternalStore, não um
// efeito) — evita tanto o "setState dentro de efeito" quanto a divergência
// entre o HTML gerado no servidor (sem acesso a sessionStorage) e o que o
// navegador mostra depois.
function useFoiFechadoNaSessao() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(CHAVE_SESSAO) === '1';
      } catch {
        return false;
      }
    },
    () => false,
  );
}

export function AlertaPendenciasModal({ itens }: AlertaPendenciasModalProps) {
  const fechadoNaSessao = useFoiFechadoNaSessao();
  // Fechar nessa aba precisa refletir na hora, sem esperar um storage event
  // (que só dispara em OUTRAS abas) — esse estado local cobre só isso.
  const [fechadoAgora, setFechadoAgora] = useState(false);
  const aberto = itens.length > 0 && !fechadoNaSessao && !fechadoAgora;

  function fechar() {
    setFechadoAgora(true);
    try {
      sessionStorage.setItem(CHAVE_SESSAO, '1');
    } catch {
      // Sem storage disponível — só fecha pra essa renderização, sem persistir.
    }
  }

  useEffect(() => {
    if (!aberto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') fechar();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col gap-4 rounded-2xl bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0 text-status-inactive" />
            <h2 className="text-lg font-semibold">
              {itens.length} {itens.length === 1 ? 'tarefa precisa' : 'tarefas precisam'} de atenção
            </h2>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-muted">Tarefas Avulsas atrasadas ou com vencimento hoje.</p>

        <ul className="flex flex-col gap-2 overflow-y-auto">
          {itens.map((item) => (
            <li key={item.id}>
              <Link
                href={`/quadro-tarefas/${item.id}/editar`}
                onClick={fechar}
                className="block rounded-xl border border-border px-3 py-2 hover:bg-surface-muted"
              >
                <span
                  className={`text-xs font-medium ${
                    item.urgencia === 'atrasada' ? 'text-status-inactive' : 'text-status-pending'
                  }`}
                >
                  {URGENCIA_LABEL[item.urgencia]}
                </span>
                <p className="text-sm font-medium">
                  #{item.numero} {item.titulo}
                </p>
                <p className="text-xs text-muted">
                  {item.departamentoNome}
                  {item.clienteNome ? ` · ${item.clienteNome}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/quadro-tarefas"
          onClick={fechar}
          className="rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Ver mais na Tabela de Tarefas Avulsas
        </Link>
      </div>
    </div>
  );
}
