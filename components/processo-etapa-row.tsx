'use client';

import { ChevronDown, Lock } from 'lucide-react';
import { useActionState, useState, useTransition } from 'react';
import {
  updateProcessoEtapaDetalhes,
  updateProcessoEtapaStatus,
  type ProcessoFormState,
} from '@/app/(dashboard)/processos/actions';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import {
  PROCESSO_ETAPA_STATUS_LABELS,
  TAXA_JUCEMG_SITUACAO_LABELS,
  type ProcessoEtapa,
  type ProcessoEtapaStatus,
  type ProcessoTaxaJucemg,
} from '@/types/processo';

type ProcessoEtapaRowProps = {
  numero: number;
  etapa: ProcessoEtapa;
  taxa?: ProcessoTaxaJucemg;
  membros: MembroDepartamento[];
  // false quando existe alguma etapa anterior travada por taxa JUCEMG ainda
  // não resolvida — mesma regra aplicada nas RPCs.
  semGateAnteriorPendente: boolean;
};

const initialState: ProcessoFormState = { error: null };

function formatarData(data: string | null) {
  return data ? new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR') : null;
}

export function ProcessoEtapaRow({
  numero,
  etapa,
  taxa,
  membros,
  semGateAnteriorPendente,
}: ProcessoEtapaRowProps) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusRapido, setStatusRapido] = useState(etapa.status);
  const [erroRapido, setErroRapido] = useState('');
  const [state, formAction, pendingDetalhe] = useActionState(
    updateProcessoEtapaDetalhes.bind(null, etapa.id),
    initialState,
  );

  const bloqueadaPorTaxa =
    etapa.trava_por_taxa_jucemg && (!taxa || !['paga', 'dispensada'].includes(taxa.situacao));
  const bloqueadaPorGateAnterior = !semGateAnteriorPendente;
  const bloqueada = bloqueadaPorGateAnterior || bloqueadaPorTaxa;
  const subtitulo = bloqueadaPorGateAnterior
    ? 'Aguardando a Taxa JUCEMG de uma etapa anterior'
    : bloqueadaPorTaxa
      ? `Aguardando confirmação da taxa JUCEMG${taxa ? ` (${TAXA_JUCEMG_SITUACAO_LABELS[taxa.situacao]})` : ''}`
      : (formatarData(etapa.prazo) ?? 'Sem prazo definido');

  function mudarStatusRapido(status: ProcessoEtapaStatus) {
    setErroRapido('');
    setStatusRapido(status);
    startTransition(async () => {
      const { error } = await updateProcessoEtapaStatus(etapa.id, status);
      if (error) {
        setErroRapido(error);
        setStatusRapido(etapa.status);
      }
    });
  }

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-muted">
          {bloqueada ? <Lock size={12} strokeWidth={2.5} /> : numero}
        </span>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <p className="font-medium">{etapa.nome}</p>
            <p className={`text-xs ${bloqueada ? 'text-status-pending' : 'text-muted'}`}>{subtitulo}</p>
            {erroRapido ? <p className="mt-1 text-xs text-status-inactive">{erroRapido}</p> : null}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2}
            className={`shrink-0 text-muted transition-transform ${aberto ? 'rotate-180' : ''}`}
          />
        </button>
        <select
          value={statusRapido}
          disabled={isPending || (bloqueada && statusRapido === 'pendente')}
          onChange={(e) => mudarStatusRapido(e.target.value as ProcessoEtapaStatus)}
          className="input w-auto"
        >
          {Object.entries(PROCESSO_ETAPA_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value} disabled={bloqueada && value !== 'pendente'}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {aberto ? (
        <form
          action={formAction}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-surface-muted/60 p-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={`etapa-prazo-${etapa.id}`} className="text-sm font-medium">
              Prazo da etapa
            </label>
            <input
              id={`etapa-prazo-${etapa.id}`}
              name="prazo"
              type="date"
              defaultValue={etapa.prazo ?? ''}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Responsável</span>
            <SearchableSelect
              name="responsavel_id"
              options={membros.map((m) => ({ id: m.id, label: m.nome || m.email, group: m.grupo }))}
              defaultValue={etapa.responsavel_id}
              placeholder="Buscar responsável…"
              emptyLabel="Sem responsável"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`etapa-protocolo-${etapa.id}`} className="text-sm font-medium">
              Protocolo
            </label>
            <input
              id={`etapa-protocolo-${etapa.id}`}
              name="protocolo"
              defaultValue={etapa.protocolo ?? ''}
              className="input"
            />
          </div>
          {/* Status não é editável aqui de propósito — é o mesmo campo do
              seletor rápido ao lado do nome da etapa, pra não duplicar o
              controle; segue junto no salvamento pra não ser sobrescrito. */}
          <input type="hidden" name="status" value={statusRapido} />
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor={`etapa-observacoes-${etapa.id}`} className="text-sm font-medium">
              Observações da etapa
            </label>
            <textarea
              id={`etapa-observacoes-${etapa.id}`}
              name="observacoes"
              rows={3}
              defaultValue={etapa.observacoes ?? ''}
              className="input"
            />
          </div>

          {state.error ? <p className="text-sm text-status-inactive sm:col-span-2">{state.error}</p> : null}

          <Button type="submit" disabled={pendingDetalhe} variant="secondary" className="w-fit sm:col-span-2">
            {pendingDetalhe ? 'Salvando…' : 'Salvar etapa'}
          </Button>
        </form>
      ) : null}
    </li>
  );
}
