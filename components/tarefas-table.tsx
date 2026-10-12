'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { updateResponsavelPadraoMes } from '@/app/(dashboard)/clientes/actions';
import { ClienteDriveLink } from './cliente-drive-link';
import { TarefaCell } from './tarefa-cell';
import { ResponsavelPadraoCell } from './responsavel-padrao-cell';
import { StickyScrollbar } from './sticky-scrollbar';
import { formatDocumento, onlyDigits } from '@/lib/cnpj';
import { temPendencia } from '@/lib/tem-pendencia';
import { createClient } from '@/lib/supabase/client';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import type { Cliente } from '@/types/cliente';
import type { Coluna } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';

// Mesmo critério de "tem pendência" do sininho no topbar e da Dashboard
// (lib/indicadores.ts), aqui como marcador visual por linha — laranja quando
// falta algo, verde quando está tudo em dia.
function PontoPendencia({ pendente }: { pendente: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        pendente ? 'bg-status-pending' : 'bg-status-active'
      }`}
      title={pendente ? 'Tem pendência este mês' : 'Sem pendência este mês'}
    />
  );
}

type TarefasTableProps = {
  clientes: Cliente[];
  colunas: Coluna[];
  opcoesPorColuna: Record<string, string[]>;
  tarefasPorCliente: Record<string, Tarefa | undefined>;
  profiles: { id: string; email: string; nome: string; status: 'ativo' | 'inativo' }[];
  departamentoId: string;
  competencia: string;
  currentUserName: string;
  membrosDoDepartamento: MembroDepartamento[];
  podeEditarResponsavelPadrao: boolean;
  // Usado só quando ainda não existe linha de tarefas pra este mês (cliente
  // vinculado ao departamento depois da última virada) — nesse caso mostra
  // o padrão do cadastro em vez de vazio. Se a linha já existe, o valor
  // dela vale sempre, mesmo que seja null (responsável removido de propósito).
  responsavelPadraoPorClienteFallback: Record<string, string | null>;
};

export function TarefasTable({
  clientes,
  colunas,
  opcoesPorColuna,
  tarefasPorCliente,
  profiles,
  departamentoId,
  competencia,
  currentUserName,
  membrosDoDepartamento,
  podeEditarResponsavelPadrao,
  responsavelPadraoPorClienteFallback,
}: TarefasTableProps) {
  const [q, setQ] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendente' | 'em_dia'>('todos');
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Link do nome do cliente leva pro cadastro já sabendo pra onde voltar
  // (essa mesma aba/departamento/filtro) — usado pelo botão "Salvar" do
  // cadastro pra trazer o usuário de volta pro lugar exato de onde saiu, em
  // vez de cair sempre na lista geral de clientes.
  const voltarUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  // Reflete sozinha qualquer mudança em `tarefas` deste departamento — seja
  // uma edição feita pelo cadastro do cliente (que atualiza o responsável do
  // mês corrente por baixo dos panos) ou por outra pessoa preenchendo uma
  // célula em outra aba/computador. Sem isso, só um F5 manual mostraria a
  // mudança, o que passa impressão de bug pra quem está com a tela aberta.
  useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelado = false;
    let canal: ReturnType<typeof supabase.channel> | null = null;

    // Sem isso, a conexão do Realtime nasce autenticada como "anon" (só o
    // apikey, sem o token da sessão) — e a policy de checagem de coluna do
    // Realtime rejeita o filtro por departamento_id pra esse papel (RLS de
    // tarefas é liberada pra "authenticated", não pra "anon").
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelado) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      canal = supabase
        .channel(`tarefas-departamento-${departamentoId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tarefas', filter: `departamento_id=eq.${departamentoId}` },
          () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => router.refresh(), 400);
          },
        )
        .subscribe();
    });

    return () => {
      cancelado = true;
      if (timeout) clearTimeout(timeout);
      if (canal) supabase.removeChannel(canal);
    };
  }, [departamentoId, router]);

  const nomePorId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.nome || p.email])),
    [profiles],
  );

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return clientes;
    const termoDigits = onlyDigits(q);
    return clientes.filter(
      (c) =>
        c.nome_fantasia.toLowerCase().includes(termo) ||
        c.razao_social.toLowerCase().includes(termo) ||
        (c.codigo?.toLowerCase().includes(termo) ?? false) ||
        (termoDigits.length > 0 && c.cnpj.includes(termoDigits)),
    );
  }, [clientes, q]);

  // Cada cliente já carrega se tem pendência, mesma definição usada no
  // sininho do topbar e na Dashboard (lib/indicadores.ts / lib/tem-pendencia.ts).
  const todosComPendencia = useMemo(
    () =>
      filtrados.map((cliente) => ({
        cliente,
        pendente: temPendencia(colunas, tarefasPorCliente[cliente.id]?.valores),
      })),
    [filtrados, tarefasPorCliente, colunas],
  );

  const linhas = useMemo(() => {
    if (statusFiltro === 'todos') return todosComPendencia;
    return todosComPendencia.filter((l) => (statusFiltro === 'pendente' ? l.pendente : !l.pendente));
  }, [todosComPendencia, statusFiltro]);

  const clienteIndexPorId = useMemo(
    () => new Map(filtrados.map((c, i) => [c.id, i])),
    [filtrados],
  );

  function responsavelPadraoExibido(clienteId: string): string | null {
    const tarefa = tarefasPorCliente[clienteId];
    return tarefa ? tarefa.responsavel_padrao_id : (responsavelPadraoPorClienteFallback[clienteId] ?? null);
  }
  function nomeResponsavelPadrao(clienteId: string) {
    const respId = responsavelPadraoExibido(clienteId);
    return respId ? (nomePorId.get(respId) ?? '—') : '—';
  }
  const [lastEdits, setLastEdits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [clienteId, tarefa] of Object.entries(tarefasPorCliente)) {
      if (tarefa?.updated_at) initial[clienteId] = tarefa.updated_at;
    }
    return initial;
  });
  const [lastEditors, setLastEditors] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [clienteId, tarefa] of Object.entries(tarefasPorCliente)) {
      if (tarefa?.updated_by) initial[clienteId] = nomePorId.get(tarefa.updated_by) ?? '—';
    }
    return initial;
  });

  function marcarEditado(clienteId: string) {
    setLastEdits((prev) => ({ ...prev, [clienteId]: new Date().toISOString() }));
    setLastEditors((prev) => ({ ...prev, [clienteId]: currentUserName }));
  }

  const statusOpcoes: { valor: typeof statusFiltro; label: ReactNode }[] = [
    { valor: 'todos', label: 'Todos' },
    {
      valor: 'pendente',
      label: (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-status-pending" /> Pendente
        </>
      ),
    },
    {
      valor: 'em_dia',
      label: (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-status-active" /> Em dia
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente ou CNPJ…"
          className="input max-w-sm"
        />
        <div className="flex gap-1.5">
          {statusOpcoes.map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => setStatusFiltro(op.valor)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFiltro === op.valor
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-surface-muted text-foreground/70 hover:bg-surface-muted/70'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="app-card scrollbar-hidden overflow-x-auto">
        <table className="app-table w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-r border-border bg-[var(--table-header-bg)]">
                Cliente
              </th>
              <th>Responsável</th>
              {colunas.map((coluna) => (
                <th key={coluna.id}>{coluna.nome}</th>
              ))}
              <th>Última edição</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ cliente, pendente }) => {
              const tarefa = tarefasPorCliente[cliente.id];
              const lastEdit = lastEdits[cliente.id];
              const lastEditor = lastEditors[cliente.id];
              const rowBg =
                (clienteIndexPorId.get(cliente.id) ?? 0) % 2 === 1 ? 'bg-surface-muted' : 'bg-surface';
              return (
                <tr key={cliente.id} className={rowBg}>
                  <td
                    className={`sticky left-0 z-10 max-w-56 border-r border-border align-top ${rowBg}`}
                  >
                    <Link
                      href={`/clientes/${cliente.id}/editar?voltar=${encodeURIComponent(voltarUrl)}`}
                      className="flex items-center gap-1.5 truncate font-medium hover:underline"
                      title={cliente.razao_social}
                    >
                      <PontoPendencia pendente={pendente} />
                      {cliente.razao_social}
                    </Link>
                    <p className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted">
                      {cliente.codigo ? `${cliente.codigo} — ` : ''}
                      {formatDocumento(cliente.cnpj)}
                      <ClienteDriveLink url={cliente.google_drive_url} />
                    </p>
                  </td>
                  <td className="whitespace-nowrap">
                    {podeEditarResponsavelPadrao ? (
                      <ResponsavelPadraoCell
                        key={`${cliente.id}-${responsavelPadraoExibido(cliente.id)}`}
                        membros={membrosDoDepartamento}
                        initialValue={responsavelPadraoExibido(cliente.id)}
                        initialValueLabel={nomeResponsavelPadrao(cliente.id)}
                        action={(novoValor) =>
                          updateResponsavelPadraoMes(cliente.id, departamentoId, competencia, novoValor)
                        }
                      />
                    ) : (
                      nomeResponsavelPadrao(cliente.id)
                    )}
                  </td>
                  {colunas.map((coluna) => (
                    <td key={coluna.id}>
                      <TarefaCell
                        clienteId={cliente.id}
                        departamentoId={departamentoId}
                        competencia={competencia}
                        colunaId={coluna.id}
                        tipo={coluna.tipo}
                        opcoes={opcoesPorColuna[coluna.id] ?? []}
                        profiles={profiles}
                        initialValue={tarefa?.valores?.[coluna.id] ?? ''}
                        campoClienteAlvo={coluna.campo_cliente_alvo}
                        campoClienteValor={
                          coluna.campo_cliente_alvo ? cliente[coluna.campo_cliente_alvo] : null
                        }
                        linkIcone={coluna.link_icone}
                        linkUrl={coluna.link_url}
                        onSaved={() => marcarEditado(cliente.id)}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap">
                    <p className="text-sm">{lastEditor ?? '—'}</p>
                    <p className="text-xs text-muted">
                      {lastEdit ? new Date(lastEdit).toLocaleString('pt-BR') : '—'}
                    </p>
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={colunas.length + 3} className="p-4 text-center text-muted">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <StickyScrollbar targetRef={scrollRef} />
    </div>
  );
}
