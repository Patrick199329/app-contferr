'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TAXA_JUCEMG_SITUACAO_LABELS, type ProcessoTaxaJucemg } from '@/types/processo';

export type LinhaTaxaJucemg = {
  taxa: ProcessoTaxaJucemg;
  processoId: string;
  etapaNome: string;
  clienteNome: string;
};

type ProcessosJucemgListProps = {
  linhas: LinhaTaxaJucemg[];
};

function formatarData(data: string | null) {
  return data ? new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR') : '—';
}

function formatarValor(valor: number | null) {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProcessosJucemgList({ linhas }: ProcessosJucemgListProps) {
  const [filtro, setFiltro] = useState<'pendentes' | 'todas'>('pendentes');

  const filtradas = useMemo(() => {
    if (filtro === 'todas') return linhas;
    return linhas.filter((l) => !['paga', 'dispensada'].includes(l.taxa.situacao));
  }, [linhas, filtro]);

  const aguardandoLiberacao = filtradas.filter(
    (l) => !['paga', 'dispensada'].includes(l.taxa.situacao),
  ).length;
  const valorPago = filtradas
    .filter((l) => l.taxa.situacao === 'paga')
    .reduce((soma, l) => soma + (l.taxa.valor ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Confirme o pagamento antes de liberar a etapa travada.</p>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as 'pendentes' | 'todas')}
          className="input w-auto"
        >
          <option value="pendentes">Pendentes de liberação</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="app-card p-4">
          <p className="text-xs font-medium text-muted uppercase">Visíveis no filtro</p>
          <p className="text-2xl font-bold">{filtradas.length}</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-medium text-muted uppercase">Aguardando liberação</p>
          <p className="text-2xl font-bold">{aguardandoLiberacao}</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-medium text-muted uppercase">Valor pago no filtro</p>
          <p className="text-2xl font-bold">{formatarValor(valorPago)}</p>
        </div>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="app-table w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th>Cliente / Processo</th>
              <th>Guia</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Situação</th>
              <th>{'Etapa'}</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((linha) => {
              const liberada = ['paga', 'dispensada'].includes(linha.taxa.situacao);
              return (
                <tr key={linha.taxa.id}>
                  <td>
                    <Link href={`/processos/${linha.processoId}`} className="font-medium hover:underline">
                      {linha.clienteNome}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-muted">{linha.taxa.numero_guia ?? '—'}</td>
                  <td className="whitespace-nowrap text-muted">{formatarData(linha.taxa.vencimento)}</td>
                  <td className="whitespace-nowrap">{formatarValor(linha.taxa.valor)}</td>
                  <td className="whitespace-nowrap">
                    <Badge tone="neutral">{TAXA_JUCEMG_SITUACAO_LABELS[linha.taxa.situacao]}</Badge>
                  </td>
                  <td className="whitespace-nowrap">
                    <p className="text-sm">{linha.etapaNome}</p>
                    <Badge tone={liberada ? 'active' : 'inactive'}>
                      {liberada ? 'Liberado' : 'Bloqueado'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">
                  Nenhuma taxa encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
