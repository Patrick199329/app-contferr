'use client';

import { useState, useTransition } from 'react';
import { updateTarefaValor } from '@/app/(dashboard)/tarefas/actions';
import type { ColunaTipo } from '@/types/departamento';

type TarefaCellProps = {
  clienteId: string;
  departamentoId: string;
  competencia: string;
  colunaId: string;
  tipo: ColunaTipo;
  opcoes?: string[];
  profiles?: { id: string; email: string }[];
  initialValue: string;
};

export function TarefaCell({
  clienteId,
  departamentoId,
  competencia,
  colunaId,
  tipo,
  opcoes = [],
  profiles = [],
  initialValue,
}: TarefaCellProps) {
  const [value, setValue] = useState(initialValue);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(newValue: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateTarefaValor(clienteId, departamentoId, competencia, colunaId, newValue);
        setDirty(false);
      } catch {
        setError('Erro ao salvar');
      }
    });
  }

  const inputClass =
    'w-full rounded border border-transparent bg-transparent px-2 py-1 hover:border-black/15 focus:border-black/30 dark:hover:border-white/20';

  let field: React.ReactNode;

  if (tipo === 'texto') {
    field = (
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        onBlur={() => dirty && save(value)}
        className={inputClass}
      />
    );
  } else if (tipo === 'data') {
    field = (
      <input
        type="date"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        className={inputClass}
      />
    );
  } else if (tipo === 'lista_opcoes' || tipo === 'status') {
    field = (
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        className={inputClass}
      >
        <option value=""></option>
        {opcoes.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    );
  } else if (tipo === 'responsavel') {
    field = (
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        className={inputClass}
      >
        <option value=""></option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.email}
          </option>
        ))}
      </select>
    );
  } else {
    field = null;
  }

  return (
    <div className="flex items-center gap-1">
      {field}
      {isPending ? <span className="text-xs text-black/40 dark:text-white/40">…</span> : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
