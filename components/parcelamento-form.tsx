'use client';

import { useActionState } from 'react';
import type { ParcelamentoFormState } from '@/app/(dashboard)/parcelamentos/actions';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import {
  PARCELAMENTO_SITUACAO_LABELS,
  type Parcelamento,
  type ParcelamentoSituacao,
} from '@/types/parcelamento';

type ParcelamentoFormProps = {
  action: (
    prevState: ParcelamentoFormState,
    formData: FormData,
  ) => Promise<ParcelamentoFormState>;
  clientesDisponiveis: { id: string; nome_fantasia: string }[];
  membros: MembroDepartamento[];
  origensSugeridas: string[];
  initialValues?: Parcelamento;
  defaultResponsavelId?: string;
  submitLabel: string;
};

const initialState: ParcelamentoFormState = { error: null };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function ParcelamentoForm({
  action,
  clientesDisponiveis,
  membros,
  origensSugeridas,
  initialValues,
  defaultResponsavelId,
  submitLabel,
}: ParcelamentoFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">Identificação</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Cliente *</span>
            <SearchableSelect
              name="cliente_id"
              options={clientesDisponiveis.map((c) => ({ id: c.id, label: c.nome_fantasia }))}
              defaultValue={initialValues?.cliente_id ?? null}
              placeholder="Buscar cliente…"
              emptyLabel="Nenhum"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="parcelamento-origem" className="text-sm font-medium">
              Origem / Portal *
            </label>
            <input
              id="parcelamento-origem"
              name="origem"
              required
              list="parcelamento-origens"
              defaultValue={initialValues?.origem ?? ''}
              placeholder="RFB, PGFN, Estado, Regularize…"
              className="input"
            />
            <datalist id="parcelamento-origens">
              {origensSugeridas.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="parcelamento-numero" className="text-sm font-medium">
              Número do parcelamento
            </label>
            <input
              id="parcelamento-numero"
              name="numero_parcelamento"
              defaultValue={initialValues?.numero_parcelamento ?? ''}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="parcelamento-data-inicio" className="text-sm font-medium">
              Data de início
            </label>
            <input
              id="parcelamento-data-inicio"
              name="data_inicio"
              type="date"
              defaultValue={initialValues?.data_inicio ?? hoje()}
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">Parcelas</span>
        <p className="text-xs text-muted">
          A partir da data de início (mês da 1ª parcela), o sistema gera sozinho a guia de cada mês
          até hoje — cada uma como não enviada/não paga, pra você marcar o que já aconteceu.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="parcelamento-quantidade" className="text-sm font-medium">
              Quantidade de parcelas *
            </label>
            <input
              id="parcelamento-quantidade"
              name="quantidade_parcelas"
              type="number"
              min={1}
              required
              defaultValue={initialValues?.quantidade_parcelas ?? ''}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="parcelamento-tolerancia" className="text-sm font-medium">
              Perder negociação após quantos meses sem pagar
            </label>
            <input
              id="parcelamento-tolerancia"
              name="meses_tolerancia_inadimplencia"
              type="number"
              min={1}
              placeholder="Sem regra automática"
              defaultValue={initialValues?.meses_tolerancia_inadimplencia ?? ''}
              className="input"
            />
            <span className="text-xs text-muted">
              Deixe em branco se não perder.
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">Controle</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {initialValues ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="parcelamento-situacao" className="text-sm font-medium">
                Situação
              </label>
              <select
                id="parcelamento-situacao"
                name="situacao"
                defaultValue={initialValues.situacao}
                className="input"
              >
                {(Object.entries(PARCELAMENTO_SITUACAO_LABELS) as [ParcelamentoSituacao, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
          ) : (
            <input type="hidden" name="situacao" value="ativo" />
          )}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Responsável</span>
            <SearchableSelect
              name="responsavel_id"
              options={membros.map((m) => ({ id: m.id, label: m.nome || m.email, group: m.grupo }))}
              defaultValue={initialValues ? initialValues.responsavel_id : (defaultResponsavelId ?? null)}
              placeholder="Buscar responsável…"
              emptyLabel="Sem responsável"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="parcelamento-observacoes" className="text-sm font-medium">
              Observações
            </label>
            <textarea
              id="parcelamento-observacoes"
              name="observacoes"
              rows={3}
              defaultValue={initialValues?.observacoes ?? ''}
              className="input"
            />
          </div>
        </div>
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}
