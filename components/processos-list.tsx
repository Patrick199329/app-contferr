'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ClienteDriveLink } from '@/components/cliente-drive-link';
import { Badge } from '@/components/ui/badge';
import type { Processo, ProcessoEtapa, TipoProcesso } from '@/types/processo';

type ClienteResumo = { id: string; nome_fantasia: string; google_drive_url?: string | null };
type Pessoa = { id: string; nome: string; email: string };

type ProcessosListProps = {
  processos: Processo[];
  tiposPorId: Record<string, TipoProcesso>;
  etapasPorProcessoId: Record<string, ProcessoEtapa[]>;
  clientes: ClienteResumo[];
  profiles: Pessoa[];
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarPrazo(prazo: string | null) {
  return prazo ? new Date(`${prazo}T00:00:00`).toLocaleDateString('pt-BR') : '—';
}

function corPrazo(prazo: string | null): string {
  if (!prazo) return 'text-muted';
  const hoje = hojeISO();
  const emDoisDias = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (prazo < hoje) return 'text-status-inactive font-medium';
  if (prazo <= emDoisDias) return 'text-status-pending font-medium';
  return 'text-foreground';
}

export function ProcessosList({
  processos,
  tiposPorId,
  etapasPorProcessoId,
  clientes,
  profiles,
}: ProcessosListProps) {
  const [busca, setBusca] = useState('');

  const clientePorId = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.nome_fantasia])),
    [clientes],
  );
  const driveUrlPorClienteId = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.google_drive_url ?? null])),
    [clientes],
  );
  const pessoaPorId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.nome || p.email])),
    [profiles],
  );

  const nomeCliente = (p: Processo) =>
    p.cliente_id ? (clientePorId.get(p.cliente_id) ?? '—') : (p.cliente_nome_avulso ?? '—');
  const nomeResponsavel = (p: Processo) =>
    p.responsavel_id ? (pessoaPorId.get(p.responsavel_id) ?? '—') : 'Sem responsável';

  function etapaAtual(processo: Processo) {
    const etapas = etapasPorProcessoId[processo.id] ?? [];
    return etapas.find((e) => e.status !== 'concluida') ?? etapas[etapas.length - 1] ?? null;
  }

  function progresso(processo: Processo) {
    const etapas = etapasPorProcessoId[processo.id] ?? [];
    if (etapas.length === 0) return 0;
    const concluidas = etapas.filter((e) => e.status === 'concluida').length;
    return Math.round((concluidas / etapas.length) * 100);
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return processos;
    return processos.filter((p) => {
      const campos = [
        p.titulo,
        nomeCliente(p),
        nomeResponsavel(p),
        p.protocolo_geral ?? '',
        tiposPorId[p.tipo_processo_id]?.nome ?? '',
      ];
      return campos.some((c) => c.toLowerCase().includes(termo));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processos, busca, clientePorId, pessoaPorId, tiposPorId]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar cliente, protocolo ou título…"
        className="input max-w-sm"
      />

      <ul className="app-card flex flex-col divide-y divide-border">
        {filtrados.map((processo) => {
          const tipo = tiposPorId[processo.tipo_processo_id];
          const atual = etapaAtual(processo);
          const pct = progresso(processo);
          return (
            <li key={processo.id} className="flex items-center">
              <Link
                href={`/processos/${processo.id}`}
                className="flex flex-1 flex-wrap items-center gap-4 p-4 hover:bg-surface-muted/60"
              >
                {tipo ? (
                  <span
                    className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: tipo.cor }}
                  >
                    {tipo.codigo}
                  </span>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nomeCliente(processo)}</p>
                  <p className="truncate text-sm text-muted">
                    {tipo?.nome ?? '—'}
                    {atual ? ` • ${atual.nome}` : ''}
                  </p>
                </div>

                <div className="text-sm whitespace-nowrap text-muted">
                  <p className="text-xs uppercase">Responsável</p>
                  {nomeResponsavel(processo)}
                </div>

                <div className="flex w-32 flex-col gap-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted">{pct}%</span>
                </div>

                <div className="text-sm whitespace-nowrap">
                  <p className="text-xs text-muted uppercase">Prazo</p>
                  <span className={corPrazo(processo.prazo_final)}>
                    {formatarPrazo(processo.prazo_final)}
                  </span>
                </div>

                {processo.status !== 'ativo' ? (
                  <Badge tone={processo.status === 'concluido' ? 'active' : 'inactive'}>
                    {processo.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                  </Badge>
                ) : null}
              </Link>
              {processo.cliente_id ? (
                <ClienteDriveLink
                  url={driveUrlPorClienteId.get(processo.cliente_id)}
                  className="mr-4"
                />
              ) : null}
            </li>
          );
        })}
        {filtrados.length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum processo encontrado.</li>
        ) : null}
      </ul>
    </div>
  );
}
