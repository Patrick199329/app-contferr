'use client';

import { useMemo, useRef, useState } from 'react';
import { StickyScrollbar } from '@/components/sticky-scrollbar';
import { formatCnpj, onlyDigits } from '@/lib/cnpj';
import { copyToClipboard } from '@/lib/clipboard';
import { resolveDisplayValue } from '@/lib/valores-tarefa';
import { CAMPOS_CLIENTE_RESTRITOS, type Cliente } from '@/types/cliente';
import type { Coluna } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';
import { Badge } from '@/components/ui/badge';
import { LINK_ICONES, normalizarUrl } from '@/lib/link-icones';

type HistoricoTableProps = {
  clientes: Cliente[];
  colunas: Coluna[];
  tarefasPorCliente: Record<string, Tarefa | undefined>;
  profiles: { id: string; email: string; nome: string }[];
};

function ValorCampoCliente({ coluna, cliente }: { coluna: Coluna; cliente: Cliente }) {
  const [visivel, setVisivel] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const valor = (coluna.campo_cliente_alvo ? cliente[coluna.campo_cliente_alvo] : null) ?? '';
  const sensivel = coluna.campo_cliente_alvo
    ? CAMPOS_CLIENTE_RESTRITOS.includes(coluna.campo_cliente_alvo)
    : false;

  function copiar() {
    if (!valor) return;
    copyToClipboard(valor).then((ok) => {
      if (!ok) return;
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  if (!valor) return <>—</>;
  return (
    <span className="flex items-center gap-2">
      <span>{sensivel && !visivel ? '••••••' : valor}</span>
      <span className="flex flex-col items-start">
        {sensivel ? (
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            className="text-xs text-muted hover:underline"
          >
            {visivel ? 'Esconder' : 'Mostrar'}
          </button>
        ) : null}
        <button type="button" onClick={copiar} className="text-xs text-muted hover:underline">
          {copiado ? 'Copiado!' : 'Copiar'}
        </button>
      </span>
    </span>
  );
}

function ValorLink({ coluna }: { coluna: Coluna }) {
  if (!coluna.link_url) return <>—</>;
  const Icon = LINK_ICONES[coluna.link_icone].Icon;
  return (
    <a
      href={normalizarUrl(coluna.link_url)}
      target="_blank"
      rel="noreferrer"
      title={coluna.link_url}
      className="inline-flex text-muted hover:text-primary"
    >
      <Icon size={18} />
    </a>
  );
}

export function HistoricoTable({ clientes, colunas, tarefasPorCliente, profiles }: HistoricoTableProps) {
  const [q, setQ] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const nomePorId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.nome || p.email])),
    [profiles],
  );

  function nomeResponsavelPadrao(tarefa: Tarefa | undefined) {
    const respId = tarefa?.responsavel_padrao_id;
    return respId ? (nomePorId.get(respId) ?? '—') : '—';
  }

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return clientes;
    const termoDigits = onlyDigits(q);
    return clientes.filter(
      (c) =>
        c.nome_fantasia.toLowerCase().includes(termo) ||
        c.razao_social.toLowerCase().includes(termo) ||
        (termoDigits.length > 0 && c.cnpj.includes(termoDigits)),
    );
  }, [clientes, q]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar cliente ou CNPJ…"
        className="input max-w-sm"
      />

      <div ref={scrollRef} className="app-card scrollbar-hidden overflow-x-auto">
        <table className="app-table w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-r border-border bg-[var(--table-header-bg)]">
                Cliente
              </th>
              <th>Responsável</th>
              {colunas.map((coluna) => (
                <th key={coluna.id}>
                  {coluna.nome}
                  {coluna.status === 'inativo' ? <Badge tone="neutral"> inativa</Badge> : null}
                </th>
              ))}
              <th>Última edição</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((cliente, i) => {
              const tarefa = tarefasPorCliente[cliente.id];
              const rowBg = i % 2 === 1 ? 'bg-surface-muted' : 'bg-surface';
              return (
                <tr key={cliente.id} className={rowBg}>
                  <td
                    className={`sticky left-0 z-10 max-w-56 border-r border-border align-top ${rowBg}`}
                  >
                    <p className="truncate font-medium" title={cliente.razao_social}>
                      {cliente.nome_fantasia}
                      {cliente.status === 'inativo' ? <Badge tone="inactive"> inativo</Badge> : null}
                    </p>
                    <p className="text-xs whitespace-nowrap text-muted">{formatCnpj(cliente.cnpj)}</p>
                  </td>
                  <td className="whitespace-nowrap">{nomeResponsavelPadrao(tarefa)}</td>
                  {colunas.map((coluna) => (
                    <td key={coluna.id} className="text-foreground/80">
                      {coluna.tipo === 'campo_cliente' ? (
                        <ValorCampoCliente coluna={coluna} cliente={cliente} />
                      ) : coluna.tipo === 'link' ? (
                        <ValorLink coluna={coluna} />
                      ) : (
                        resolveDisplayValue(coluna.tipo, tarefa?.valores?.[coluna.id], profiles)
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap">
                    <p className="text-sm">
                      {tarefa?.updated_by ? (nomePorId.get(tarefa.updated_by) ?? '—') : '—'}
                    </p>
                    <p className="text-xs text-muted">
                      {tarefa?.updated_at ? new Date(tarefa.updated_at).toLocaleString('pt-BR') : '—'}
                    </p>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length + 3} className="p-4 text-center text-muted">
                  {clientes.length === 0
                    ? 'Nenhum dado registrado para esta competência.'
                    : 'Nenhum cliente encontrado.'}
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
