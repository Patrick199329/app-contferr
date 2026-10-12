'use client';

import { useActionState } from 'react';
import { updateProcessoTaxaJucemg, type ProcessoFormState } from '@/app/(dashboard)/processos/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TAXA_JUCEMG_SITUACAO_LABELS,
  type ProcessoEtapa,
  type ProcessoTaxaJucemg,
} from '@/types/processo';

type TaxaJucemgCardProps = {
  processoId: string;
  etapa: ProcessoEtapa;
  taxa: ProcessoTaxaJucemg;
};

const initialState: ProcessoFormState = { error: null };

export function TaxaJucemgCard({ processoId, etapa, taxa }: TaxaJucemgCardProps) {
  const [state, formAction, pending] = useActionState(
    updateProcessoTaxaJucemg.bind(null, taxa.id, processoId),
    initialState,
  );
  const liberada = taxa.situacao === 'paga' || taxa.situacao === 'dispensada';

  return (
    <div className="app-card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted uppercase">Taxa JUCEMG</p>
          <h2 className="text-lg font-medium">{etapa.nome}</h2>
          <p className="text-sm text-muted">
            {liberada
              ? 'A etapa já pode avançar.'
              : `A etapa "${etapa.nome}" só poderá ser iniciada após confirmar o pagamento ou a dispensa.`}
          </p>
        </div>
        <Badge tone={liberada ? 'active' : 'inactive'}>{liberada ? 'Liberado' : 'Bloqueado'}</Badge>
      </div>

      <form action={formAction} className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="taxa-situacao" className="text-sm font-medium">
            Situação da taxa
          </label>
          <select id="taxa-situacao" name="situacao" defaultValue={taxa.situacao} className="input">
            {Object.entries(TAXA_JUCEMG_SITUACAO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="taxa-guia" className="text-sm font-medium">
            Número da guia / DAE
          </label>
          <input
            id="taxa-guia"
            name="numero_guia"
            defaultValue={taxa.numero_guia ?? ''}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="taxa-valor" className="text-sm font-medium">
            Valor
          </label>
          <input
            id="taxa-valor"
            name="valor"
            type="number"
            step="0.01"
            min="0"
            defaultValue={taxa.valor ?? ''}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="taxa-vencimento" className="text-sm font-medium">
            Vencimento
          </label>
          <input
            id="taxa-vencimento"
            name="vencimento"
            type="date"
            defaultValue={taxa.vencimento ?? ''}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="taxa-pagamento" className="text-sm font-medium">
            Data do pagamento
          </label>
          <input
            id="taxa-pagamento"
            name="data_pagamento"
            type="date"
            defaultValue={taxa.data_pagamento ?? ''}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="taxa-observacoes" className="text-sm font-medium">
            Observações da taxa
          </label>
          <textarea
            id="taxa-observacoes"
            name="observacoes"
            rows={2}
            defaultValue={taxa.observacoes ?? ''}
            className="input"
          />
        </div>

        {state.error ? <p className="text-sm text-status-inactive sm:col-span-2">{state.error}</p> : null}

        <Button type="submit" disabled={pending} variant="secondary" className="w-fit sm:col-span-2">
          {pending ? 'Salvando…' : 'Salvar controle da taxa'}
        </Button>
      </form>
    </div>
  );
}
