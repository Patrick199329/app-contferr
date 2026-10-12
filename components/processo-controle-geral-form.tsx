'use client';

import { useActionState } from 'react';
import type { ProcessoFormState } from '@/app/(dashboard)/processos/actions';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import {
  PROCESSO_PRIORIDADE_LABELS,
  PROCESSO_STATUS_LABELS,
  type Processo,
} from '@/types/processo';

type ProcessoControleGeralFormProps = {
  action: (prevState: ProcessoFormState, formData: FormData) => Promise<ProcessoFormState>;
  processo: Processo;
  membros: MembroDepartamento[];
};

const initialState: ProcessoFormState = { error: null };

export function ProcessoControleGeralForm({
  action,
  processo,
  membros,
}: ProcessoControleGeralFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor="controle-titulo" className="text-sm font-medium">
          Título
        </label>
        <input
          id="controle-titulo"
          name="titulo"
          required
          defaultValue={processo.titulo}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="controle-status" className="text-sm font-medium">
          Status
        </label>
        <select id="controle-status" name="status" defaultValue={processo.status} className="input">
          {Object.entries(PROCESSO_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="controle-prioridade" className="text-sm font-medium">
          Prioridade
        </label>
        <select
          id="controle-prioridade"
          name="prioridade"
          defaultValue={processo.prioridade}
          className="input"
        >
          {Object.entries(PROCESSO_PRIORIDADE_LABELS).map(([value, label]) => (
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
          defaultValue={processo.responsavel_id}
          placeholder="Buscar responsável…"
          emptyLabel="Sem responsável"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="controle-prazo" className="text-sm font-medium">
          Prazo final
        </label>
        <input
          id="controle-prazo"
          name="prazo_final"
          type="date"
          defaultValue={processo.prazo_final ?? ''}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="controle-protocolo" className="text-sm font-medium">
          Protocolo geral
        </label>
        <input
          id="controle-protocolo"
          name="protocolo_geral"
          defaultValue={processo.protocolo_geral ?? ''}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor="controle-observacoes" className="text-sm font-medium">
          Observações
        </label>
        <textarea
          id="controle-observacoes"
          name="observacoes"
          rows={3}
          defaultValue={processo.observacoes ?? ''}
          className="input"
        />
      </div>

      {state.error ? <p className="text-sm text-status-inactive sm:col-span-2">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit sm:col-span-2">
        {pending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  );
}
