'use client';

import { useMemo, useState } from 'react';
import { TarefaCell } from './tarefa-cell';
import type { Cliente } from '@/types/cliente';
import type { Coluna } from '@/types/departamento';
import type { Tarefa } from '@/types/tarefa';

type TarefasTableProps = {
  clientes: Cliente[];
  colunas: Coluna[];
  opcoesPorColuna: Record<string, string[]>;
  tarefasPorCliente: Record<string, Tarefa | undefined>;
  profiles: { id: string; email: string }[];
  departamentoId: string;
  competencia: string;
};

export function TarefasTable({
  clientes,
  colunas,
  opcoesPorColuna,
  tarefasPorCliente,
  profiles,
  departamentoId,
  competencia,
}: TarefasTableProps) {
  const [q, setQ] = useState('');
  const [lastEdits, setLastEdits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [clienteId, tarefa] of Object.entries(tarefasPorCliente)) {
      if (tarefa?.updated_at) initial[clienteId] = tarefa.updated_at;
    }
    return initial;
  });

  function marcarEditado(clienteId: string) {
    setLastEdits((prev) => ({ ...prev, [clienteId]: new Date().toISOString() }));
  }

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        c.nome_fantasia.toLowerCase().includes(termo) ||
        c.razao_social.toLowerCase().includes(termo),
    );
  }, [clientes, q]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar cliente…"
        className="w-full max-w-sm rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/10">
              <th className="p-2">Cliente</th>
              {colunas.map((coluna) => (
                <th key={coluna.id} className="p-2">
                  {coluna.nome}
                </th>
              ))}
              <th className="p-2">Última edição</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((cliente) => {
              const tarefa = tarefasPorCliente[cliente.id];
              const lastEdit = lastEdits[cliente.id];
              return (
                <tr key={cliente.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="p-2 font-medium whitespace-nowrap">{cliente.nome_fantasia}</td>
                  {colunas.map((coluna) => (
                    <td key={coluna.id} className="p-2">
                      <TarefaCell
                        clienteId={cliente.id}
                        departamentoId={departamentoId}
                        competencia={competencia}
                        colunaId={coluna.id}
                        tipo={coluna.tipo}
                        opcoes={opcoesPorColuna[coluna.id] ?? []}
                        profiles={profiles}
                        initialValue={tarefa?.valores?.[coluna.id] ?? ''}
                        onSaved={() => marcarEditado(cliente.id)}
                      />
                    </td>
                  ))}
                  <td className="p-2 text-xs whitespace-nowrap text-black/50 dark:text-white/50">
                    {lastEdit ? new Date(lastEdit).toLocaleString('pt-BR') : '—'}
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 ? (
              <tr>
                <td
                  colSpan={colunas.length + 2}
                  className="p-4 text-center text-black/50 dark:text-white/50"
                >
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
