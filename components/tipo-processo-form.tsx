'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';

type TipoProcessoFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: {
    nome: string;
    codigo: string;
    cor: string;
  };
  submitLabel?: string;
};

const initialState: FormState = { error: null };

export function TipoProcessoForm({ action, initialValues, submitLabel }: TipoProcessoFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="tipo-processo-nome" className="text-sm font-medium">
          Nome do tipo de serviço
        </label>
        <input
          id="tipo-processo-nome"
          name="nome"
          required
          defaultValue={initialValues?.nome}
          placeholder="Ex.: Abertura de empresa"
          className="input"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="tipo-processo-codigo" className="text-sm font-medium">
            Código
          </label>
          <input
            id="tipo-processo-codigo"
            name="codigo"
            required
            maxLength={4}
            defaultValue={initialValues?.codigo}
            placeholder="Ex.: AB"
            className="input uppercase"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tipo-processo-cor" className="text-sm font-medium">
            Cor
          </label>
          <input
            id="tipo-processo-cor"
            name="cor"
            type="color"
            defaultValue={initialValues?.cor ?? '#2563eb'}
            className="h-10 w-16 cursor-pointer rounded-lg border border-border"
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : (submitLabel ?? 'Adicionar tipo de serviço')}
      </Button>
    </form>
  );
}
