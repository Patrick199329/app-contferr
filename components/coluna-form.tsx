'use client';

import { useActionState, useState } from 'react';
import { COLUNA_TIPOS_COM_OPCOES, COLUNA_TIPO_LABELS, type ColunaTipo } from '@/types/departamento';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';

type ColunaFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
};

const initialState: FormState = { error: null };

export function ColunaForm({ action }: ColunaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tipo, setTipo] = useState<ColunaTipo>('texto');
  const precisaOpcoes = COLUNA_TIPOS_COM_OPCOES.includes(tipo);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="coluna-nome" className="text-sm font-medium">
          Nome da coluna
        </label>
        <input id="coluna-nome" name="nome" required className="input" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="coluna-tipo" className="text-sm font-medium">
          Tipo
        </label>
        <select
          id="coluna-tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as ColunaTipo)}
          className="input"
        >
          {Object.entries(COLUNA_TIPO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {precisaOpcoes ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="opcoes" className="text-sm font-medium">
            Opções (uma por linha)
          </label>
          <textarea
            id="opcoes"
            name="opcoes"
            rows={4}
            placeholder={'Pendente\nEm andamento\nConcluído'}
            className="input"
          />
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : 'Adicionar coluna'}
      </Button>
    </form>
  );
}
