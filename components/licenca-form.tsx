'use client';

import { useActionState, useState } from 'react';
import type { LicencaFormState } from '@/app/(dashboard)/alvaras/actions';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import {
  LICENCA_RECORRENCIA_LABELS,
  LICENCA_SITUACAO_LABELS,
  MESES,
  type Licenca,
  type LicencaRecorrencia,
} from '@/types/licenca';

type LicencaFormProps = {
  action: (prevState: LicencaFormState, formData: FormData) => Promise<LicencaFormState>;
  clientesDisponiveis: {
    id: string;
    nome_fantasia: string;
    cidade: string | null;
    uf: string | null;
  }[];
  membros: MembroDepartamento[];
  tiposSugeridos: string[];
  orgaosSugeridos: string[];
  initialValues?: Licenca;
  defaultResponsavelId?: string;
  submitLabel: string;
};

const initialState: LicencaFormState = { error: null };

export function LicencaForm({
  action,
  clientesDisponiveis,
  membros,
  tiposSugeridos,
  orgaosSugeridos,
  initialValues,
  defaultResponsavelId,
  submitLabel,
}: LicencaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [municipio, setMunicipio] = useState(initialValues?.municipio ?? '');
  const [uf, setUf] = useState(initialValues?.uf ?? 'MG');
  const [recorrencia, setRecorrencia] = useState<LicencaRecorrencia>(
    initialValues?.recorrencia ?? 'anual',
  );

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
              onChange={(id) => {
                const cliente = clientesDisponiveis.find((c) => c.id === id);
                if (cliente?.cidade) setMunicipio(cliente.cidade);
                if (cliente?.uf) setUf(cliente.uf.toUpperCase());
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-tipo" className="text-sm font-medium">
              Tipo *
            </label>
            <input
              id="licenca-tipo"
              name="tipo"
              required
              list="licenca-tipos"
              defaultValue={initialValues?.tipo ?? ''}
              placeholder="Ex.: Alvará de funcionamento"
              className="input"
            />
            <datalist id="licenca-tipos">
              {tiposSugeridos.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-orgao" className="text-sm font-medium">
              Órgão emissor
            </label>
            <input
              id="licenca-orgao"
              name="orgao_emissor"
              list="licenca-orgaos"
              defaultValue={initialValues?.orgao_emissor ?? ''}
              placeholder="Prefeitura, Vigilância Sanitária…"
              className="input"
            />
            <datalist id="licenca-orgaos">
              {orgaosSugeridos.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-numero" className="text-sm font-medium">
              Número da licença
            </label>
            <input
              id="licenca-numero"
              name="numero"
              defaultValue={initialValues?.numero ?? ''}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-municipio" className="text-sm font-medium">
              Município
            </label>
            <input
              id="licenca-municipio"
              name="municipio"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-uf" className="text-sm font-medium">
              UF
            </label>
            <input
              id="licenca-uf"
              name="uf"
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="input uppercase"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">Vigência e responsável</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-emissao" className="text-sm font-medium">
              Data de emissão
            </label>
            <input
              id="licenca-emissao"
              name="data_emissao"
              type="date"
              defaultValue={initialValues?.data_emissao ?? ''}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-vencimento" className="text-sm font-medium">
              Data de vencimento
            </label>
            <input
              id="licenca-vencimento"
              name="data_vencimento"
              type="date"
              defaultValue={initialValues?.data_vencimento ?? ''}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="licenca-situacao" className="text-sm font-medium">
              Situação
            </label>
            <select
              id="licenca-situacao"
              name="situacao"
              defaultValue={initialValues?.situacao ?? 'ativa'}
              className="input"
            >
              {Object.entries(LICENCA_SITUACAO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Responsável</span>
            <SearchableSelect
              name="responsavel_id"
              options={membros.map((m) => ({ id: m.id, label: m.nome || m.email, group: m.grupo }))}
              defaultValue={
                initialValues ? initialValues.responsavel_id : (defaultResponsavelId ?? null)
              }
              placeholder="Buscar responsável…"
              emptyLabel="Sem responsável"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">Taxa anual</span>
        <input type="hidden" name="recorrencia" value={recorrencia} />
        <div className="flex w-fit rounded-full bg-surface-muted p-1 text-sm">
          {(Object.entries(LICENCA_RECORRENCIA_LABELS) as [LicencaRecorrencia, string][]).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecorrencia(value)}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  recorrencia === value ? 'bg-surface shadow-sm' : 'text-muted'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {recorrencia === 'anual' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="licenca-taxa-mes" className="text-sm font-medium">
                Mês de vencimento
              </label>
              <select
                id="licenca-taxa-mes"
                name="taxa_mes"
                defaultValue={String(initialValues?.taxa_mes ?? 1)}
                className="input"
              >
                {MESES.map((mes, i) => (
                  <option key={mes} value={i + 1}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="licenca-taxa-dia" className="text-sm font-medium">
                Dia
              </label>
              <input
                id="licenca-taxa-dia"
                name="taxa_dia"
                type="number"
                min={1}
                max={31}
                defaultValue={initialValues?.taxa_dia ?? 31}
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="licenca-valor" className="text-sm font-medium">
                Valor estimado
              </label>
              <input
                id="licenca-valor"
                name="valor_estimado"
                inputMode="decimal"
                defaultValue={
                  initialValues?.valor_estimado != null
                    ? String(initialValues.valor_estimado).replace('.', ',')
                    : ''
                }
                placeholder="0,00"
                className="input"
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="licenca-observacoes" className="text-sm font-medium">
            Observações
          </label>
          <textarea
            id="licenca-observacoes"
            name="observacoes"
            rows={3}
            defaultValue={initialValues?.observacoes ?? ''}
            className="input"
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}
