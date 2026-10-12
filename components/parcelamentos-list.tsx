'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { ClienteDriveLink } from '@/components/cliente-drive-link';
import { ParcelamentoParcelaToggle } from '@/components/parcelamento-parcela-toggle';
import { Badge } from '@/components/ui/badge';
import { formatCompetencia, shiftCompetencia } from '@/lib/competencia';
import { formatDocumento } from '@/lib/cnpj';
import {
  calcularAvisoPerda,
  PARCELAMENTO_SITUACAO_LABELS,
  PARCELAMENTO_SITUACAO_TONES,
  type Parcelamento,
  type ParcelamentoParcela,
  type ParcelamentoSituacao,
} from '@/types/parcelamento';

type ClienteResumo = {
  id: string;
  nome_fantasia: string;
  cnpj: string;
  codigo: string | null;
  google_drive_url?: string | null;
};
type Pessoa = { id: string; nome: string; email: string };

type ParcelamentosListProps = {
  parcelamentos: Parcelamento[];
  // Parcelas com competencia <= competenciaAtual — cobre a célula do mês
  // exibido e o histórico anterior, usado só pra calcular o aviso de "parcela
  // anterior em aberto".
  parcelas: ParcelamentoParcela[];
  clientes: ClienteResumo[];
  profiles: Pessoa[];
  competenciaAtual: string;
  competenciaHoje: string;
  departamentoId: string;
};

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, '');
}

export function ParcelamentosList({
  parcelamentos,
  parcelas,
  clientes,
  profiles,
  competenciaAtual,
  competenciaHoje,
  departamentoId,
}: ParcelamentosListProps) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'ativo' | 'todas'>('ativo');

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const pessoaPorId = useMemo(() => new Map(profiles.map((p) => [p.id, p.nome || p.email])), [profiles]);

  const parcelasPorParcelamento = useMemo(() => {
    const mapa = new Map<string, ParcelamentoParcela[]>();
    for (const parcela of parcelas) {
      mapa.set(parcela.parcelamento_id, [...(mapa.get(parcela.parcelamento_id) ?? []), parcela]);
    }
    return mapa;
  }, [parcelas]);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = apenasDigitos(termo);
    return parcelamentos
      .filter((p) => filtro === 'todas' || p.situacao === 'ativo')
      .map((parcelamento) => {
        const historico = parcelasPorParcelamento.get(parcelamento.id) ?? [];
        const parcelaDoMes = historico.find((p) => p.competencia === competenciaAtual) ?? null;
        const temAnteriorEmAberto = historico.some(
          (p) => p.competencia < competenciaAtual && !p.pago,
        );

        return {
          parcelamento,
          cliente: clientePorId.get(parcelamento.cliente_id),
          parcelaDoMes,
          temAnteriorEmAberto,
          avisoPerda: calcularAvisoPerda(parcelamento, historico),
        };
      })
      // Sem guia gerada pra esse mês (ex.: parcelamento começou depois, ao
      // navegar pra um mês anterior) — some da lista em vez de mostrar uma
      // linha vazia "Sem guia neste mês", que só polui visualmente.
      .filter(
        (
          linha,
        ): linha is typeof linha & { parcelaDoMes: ParcelamentoParcela } =>
          linha.parcelaDoMes !== null,
      )
      .filter(({ parcelamento, cliente }) => {
        if (!termo) return true;
        const textos = [
          cliente?.nome_fantasia ?? '',
          parcelamento.origem,
          parcelamento.numero_parcelamento ?? '',
        ];
        if (textos.some((t) => t.toLowerCase().includes(termo))) return true;
        return termoDigitos.length > 0 && apenasDigitos(cliente?.cnpj ?? '').includes(termoDigitos);
      });
  }, [parcelamentos, parcelasPorParcelamento, clientePorId, busca, filtro, competenciaAtual]);

  const grupos = useMemo(() => {
    const porCliente = new Map<string, typeof linhas>();
    for (const linha of linhas) {
      porCliente.set(linha.parcelamento.cliente_id, [
        ...(porCliente.get(linha.parcelamento.cliente_id) ?? []),
        linha,
      ]);
    }
    return [...porCliente.values()].sort((a, b) =>
      (a[0].cliente?.nome_fantasia ?? '').localeCompare(b[0].cliente?.nome_fantasia ?? ''),
    );
  }, [linhas]);

  const podeAvancar = competenciaAtual < competenciaHoje;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, CNPJ, origem ou número…"
            className="input max-w-sm"
          />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as 'ativo' | 'todas')}
            className="input w-auto"
            aria-label="Filtrar por situação"
          >
            <option value="ativo">Só ativos</option>
            <option value="todas">Todas as situações</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/parcelamentos?departamento=${departamentoId}&competencia=${shiftCompetencia(competenciaAtual, -1)}`}
            aria-label="Mês anterior"
            className="rounded-full p-2 text-muted hover:bg-surface-muted"
          >
            <ChevronLeft size={18} />
          </Link>
          <span className="w-32 text-center text-sm font-medium">
            {formatCompetencia(competenciaAtual)}
          </span>
          {podeAvancar ? (
            <Link
              href={`/parcelamentos?departamento=${departamentoId}&competencia=${shiftCompetencia(competenciaAtual, 1)}`}
              aria-label="Mês seguinte"
              className="rounded-full p-2 text-muted hover:bg-surface-muted"
            >
              <ChevronRight size={18} />
            </Link>
          ) : (
            <span className="rounded-full p-2 text-muted/30">
              <ChevronRight size={18} />
            </span>
          )}
        </div>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr className="border-b border-border">
              <th className="p-4 font-medium">Cliente / Origem</th>
              <th className="p-4 font-medium">Nº parcelamento</th>
              <th className="p-4 font-medium">Parcela</th>
              <th className="p-4 font-medium">Responsável</th>
              <th className="p-4 font-medium">Este mês</th>
              <th className="p-4 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grupos.map((grupo) => (
              <Fragment key={grupo[0].parcelamento.cliente_id}>
                <tr className="bg-surface-muted/60">
                  <td colSpan={6} className="px-4 py-2">
                    {grupo[0].cliente ? (
                      <Link
                        href={`/clientes/${grupo[0].cliente.id}`}
                        className="font-semibold hover:underline"
                        title="Abrir ficha do cliente"
                      >
                        {grupo[0].cliente.nome_fantasia}
                      </Link>
                    ) : (
                      <span className="font-semibold">—</span>
                    )}
                    <ClienteDriveLink
                      url={grupo[0].cliente?.google_drive_url}
                      className="ml-2 align-middle"
                    />
                    {grupo[0].cliente ? (
                      <span className="ml-2 text-xs text-muted">
                        {formatDocumento(grupo[0].cliente.cnpj)}
                        {grupo[0].cliente.codigo ? ` • Código Alterdata: ${grupo[0].cliente.codigo}` : ''}
                      </span>
                    ) : null}
                  </td>
                </tr>
                {grupo.map(({ parcelamento, parcelaDoMes, temAnteriorEmAberto, avisoPerda }) => (
                  // Key pela guia do mês (não pelo parcelamento) — o
                  // parcelamento.id não muda ao navegar entre competências,
                  // então sem isso o React reaproveita o <tr> e o estado
                  // interno dos checkboxes de ParcelamentoParcelaToggle fica
                  // preso no valor do mês anterior em vez de refletir o novo.
                  <tr key={parcelaDoMes.id} className="hover:bg-surface-muted/60">
                    <td className="p-4 pl-8">
                      <Link
                        href={`/parcelamentos/${parcelamento.id}/editar`}
                        className="block font-medium"
                      >
                        {parcelamento.origem}
                      </Link>
                      {avisoPerda ? (
                        <Badge tone="pending">
                          Atenção: {avisoPerda.mesesEmAberto} de {avisoPerda.tolerancia} parcelas
                          vencidas em aberto, prestes a perder o parcelamento
                        </Badge>
                      ) : temAnteriorEmAberto ? (
                        <Badge tone="pending">Parcela anterior em aberto</Badge>
                      ) : null}
                    </td>
                    <td className="p-4">{parcelamento.numero_parcelamento ?? '—'}</td>
                    <td className="p-4 whitespace-nowrap">
                      {parcelaDoMes.numero_parcela}/{parcelamento.quantidade_parcelas}
                    </td>
                    <td className="p-4">
                      {parcelamento.responsavel_id
                        ? (pessoaPorId.get(parcelamento.responsavel_id) ?? '—')
                        : '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <ParcelamentoParcelaToggle
                          parcelaId={parcelaDoMes.id}
                          campo="guia_enviada"
                          valorInicial={parcelaDoMes.guia_enviada}
                          label="Guia enviada"
                        />
                        <ParcelamentoParcelaToggle
                          parcelaId={parcelaDoMes.id}
                          campo="pago"
                          valorInicial={parcelaDoMes.pago}
                          label="Pago"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge tone={PARCELAMENTO_SITUACAO_TONES[parcelamento.situacao as ParcelamentoSituacao]}>
                        {PARCELAMENTO_SITUACAO_LABELS[parcelamento.situacao]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  Nenhum parcelamento encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
