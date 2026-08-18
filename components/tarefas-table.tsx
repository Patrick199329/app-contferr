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
  profiles: { id: string; email: string; nome: string }[];
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
        className="input max-w-sm"
      />

      <div className="app-card overflow-x-auto">
        <table className="app-table w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th>Cliente</th>
              {colunas.map((coluna) => (
                <th key={coluna.id}>{coluna.nome}</th>
              ))}
              <th>Última edição</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((cliente) => {
              const tarefa = tarefasPorCliente[cliente.id];
              const lastEdit = lastEdits[cliente.id];
              return (
                <tr key={cliente.id}>
                  <td className="font-medium whitespace-nowrap">{cliente.nome_fantasia}</td>
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
                        onSaved={() => marcarEditado(cliente.id)}
                      />
                    </td>
                  ))}
                  <td className="text-xs whitespace-nowrap text-muted">
                    {lastEdit ? new Date(lastEdit).toLocaleString('pt-BR') : '—'}
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length + 2} className="p-4 text-center text-muted">
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
