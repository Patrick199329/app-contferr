'use client';

import { useActionState, useState } from 'react';
import { COLUNA_TIPOS_COM_OPCOES, COLUNA_TIPO_LABELS, type ColunaTipo } from '@/types/departamento';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';

type QuadroCampoFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: {
    nome: string;
    tipo: ColunaTipo;
  };
  submitLabel?: string;
};

const initialState: FormState = { error: null };

export function QuadroCampoForm({ action, initialValues, submitLabel }: QuadroCampoFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tipo, setTipo] = useState<ColunaTipo>(initialValues?.tipo ?? 'texto');
  const precisaOpcoes = COLUNA_TIPOS_COM_OPCOES.includes(tipo);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="campo-nome" className="text-sm font-medium">
          Nome do campo
        </label>
        <input
          id="campo-nome"
          name="nome"
          required
          defaultValue={initialValues?.nome}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="campo-tipo" className="text-sm font-medium">
          Tipo
        </label>
        <select
          id="campo-tipo"
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

      {precisaOpcoes && !initialValues ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="opcoes" className="text-sm font-medium">
            Opções (uma por linha)
          </label>
          <textarea
            id="opcoes"
            name="opcoes"
            rows={4}
            placeholder={'Abertura\nAlteração\nBaixa'}
            className="input"
          />
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : (submitLabel ?? 'Adicionar campo')}
      </Button>
    </form>
  );
}
