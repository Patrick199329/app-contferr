'use client';

import { useActionState } from 'react';
import type { ParcelamentoFormState } from '@/app/(dashboard)/parcelamentos/actions';
import { Button } from '@/components/ui/button';

type ParcelaRetroativaFormProps = {
  action: (prevState: ParcelamentoFormState, formData: FormData) => Promise<ParcelamentoFormState>;
};

const initialState: ParcelamentoFormState = { error: null };

export function ParcelaRetroativaForm({ action }: ParcelaRetroativaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="retroativa-competencia" className="text-xs font-medium text-muted">
          Mês
        </label>
        <input
          id="retroativa-competencia"
          name="competencia"
          type="month"
          required
          className="input"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="retroativa-numero" className="text-xs font-medium text-muted">
          Parcela nº
        </label>
        <input
          id="retroativa-numero"
          name="numero_parcela"
          type="number"
          min={1}
          required
          className="input w-24"
        />
      </div>
      <label className="flex items-center gap-1.5 pb-2 text-sm">
        <input type="checkbox" name="guia_enviada" className="h-4 w-4" />
        Guia enviada
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-sm">
        <input type="checkbox" name="pago" className="h-4 w-4" />
        Pago
      </label>
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? 'Adicionando…' : 'Adicionar guia'}
      </Button>
      {state.error ? <p className="w-full text-sm text-status-inactive">{state.error}</p> : null}
    </form>
  );
}
