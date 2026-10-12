'use client';

import { useActionState, useState, type ReactNode } from 'react';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';

type OpcaoEditarProps = {
  valor: string;
  badge?: ReactNode;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
};

const initialState: FormState = { error: null };

export function OpcaoEditar({ valor, badge, action }: OpcaoEditarProps) {
  const [editando, setEditando] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (editando) {
    return (
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          name="valor"
          defaultValue={valor}
          required
          autoFocus
          className="input w-auto py-1 text-sm"
        />
        <button type="submit" disabled={pending} className="text-sm text-primary hover:underline">
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="text-sm text-muted hover:underline"
        >
          Cancelar
        </button>
        {state.error ? <span className="text-xs text-status-inactive">{state.error}</span> : null}
      </form>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {valor}
      {badge}
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="text-sm text-muted hover:underline"
      >
        Editar
      </button>
    </span>
  );
}
