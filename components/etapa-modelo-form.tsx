'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';

type EtapaModeloFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: {
    nome: string;
    travaPorTaxaJucemg: boolean;
  };
  submitLabel?: string;
};

const initialState: FormState = { error: null };

export function EtapaModeloForm({ action, initialValues, submitLabel }: EtapaModeloFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="etapa-modelo-nome" className="text-sm font-medium">
          Nome da etapa
        </label>
        <input
          id="etapa-modelo-nome"
          name="nome"
          required
          defaultValue={initialValues?.nome}
          placeholder="Ex.: Registro Digital"
          className="input"
        />
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="trava_por_taxa_jucemg"
          defaultChecked={initialValues?.travaPorTaxaJucemg}
          className="h-4 w-4"
        />
        <span>
          <span className="font-medium">Trava por Taxa JUCEMG</span>
          <span className="block text-xs text-muted">
            Essa etapa só pode avançar depois que a taxa vinculada a ela for marcada como paga ou
            dispensada.
          </span>
        </span>
      </label>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : (submitLabel ?? 'Adicionar etapa')}
      </Button>
    </form>
  );
}
