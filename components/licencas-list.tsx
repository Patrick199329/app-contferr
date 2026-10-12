'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { ClienteDriveLink } from '@/components/cliente-drive-link';
import { Badge } from '@/components/ui/badge';
import {
  LICENCA_VIGENCIA_LABELS,
  LICENCA_VIGENCIA_TONES,
  calcularVigencia,
  type Licenca,
  type LicencaVigencia,
} from '@/types/licenca';

type ClienteResumo = { id: string; nome_fantasia: string; cnpj: string; google_drive_url?: string | null };

type LicencasListProps = {
  licencas: Licenca[];
  clientes: ClienteResumo[];
};

const GRAVIDADE: Record<LicencaVigencia, number> = {
  vencida: 5,
  a_vencer: 4,
  em_renovacao: 3,
  sem_vencimento: 2,
  vigente: 1,
  cancelada: 0,
};

function formatarData(data: string | null) {
  return data ? new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR') : '—';
}

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, '');
}

export function LicencasList({ licencas, clientes }: LicencasListProps) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todas' | LicencaVigencia>('todas');

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = apenasDigitos(termo);
    return licencas
      .map((licenca) => ({
        licenca,
        cliente: clientePorId.get(licenca.cliente_id),
        vigencia: calcularVigencia(licenca),
      }))
      .filter(({ licenca, cliente, vigencia }) => {
        if (filtro !== 'todas' && vigencia !== filtro) return false;
        if (!termo) return true;
        const textos = [
          cliente?.nome_fantasia ?? '',
          licenca.tipo,
          licenca.numero ?? '',
          licenca.orgao_emissor ?? '',
          licenca.municipio ?? '',
        ];
        if (textos.some((t) => t.toLowerCase().includes(termo))) return true;
        return termoDigitos.length > 0 && apenasDigitos(cliente?.cnpj ?? '').includes(termoDigitos);
      });
  }, [licencas, clientePorId, busca, filtro]);

  const grupos = useMemo(() => {
    const porCliente = new Map<string, typeof linhas>();
    for (const linha of linhas) {
      porCliente.set(linha.licenca.cliente_id, [
        ...(porCliente.get(linha.licenca.cliente_id) ?? []),
        linha,
      ]);
    }
    return [...porCliente.values()]
      .map((itens) => ({
        cliente: itens[0].cliente,
        itens,
        pior: itens.map((i) => i.vigencia).sort((a, b) => GRAVIDADE[b] - GRAVIDADE[a])[0],
      }))
      .sort((a, b) =>
        (a.cliente?.nome_fantasia ?? '').localeCompare(b.cliente?.nome_fantasia ?? ''),
      );
  }, [linhas]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente, CNPJ ou número…"
          className="input max-w-sm"
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as 'todas' | LicencaVigencia)}
          className="input w-auto"
          aria-label="Filtrar por situação"
        >
          <option value="todas">Todas</option>
          {(Object.entries(LICENCA_VIGENCIA_LABELS) as [LicencaVigencia, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
        <span className="text-sm text-muted">{linhas.length} licença(s)</span>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr className="border-b border-border">
              <th className="p-4 font-medium">Cliente / Licença</th>
              <th className="p-4 font-medium">Órgão</th>
              <th className="p-4 font-medium">Número</th>
              <th className="p-4 font-medium">Vencimento</th>
              <th className="p-4 font-medium">Situação</th>
              <th className="w-10 p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grupos.map((grupo) => (
              <Fragment key={grupo.cliente?.id ?? grupo.itens[0].licenca.cliente_id}>
                <tr className="bg-surface-muted/60">
                  <td colSpan={6} className="px-4 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {grupo.cliente ? (
                          <Link
                            href={`/clientes/${grupo.cliente.id}`}
                            title="Abrir ficha do cliente"
                            className="font-semibold hover:underline"
                          >
                            {grupo.cliente.nome_fantasia}
                          </Link>
                        ) : (
                          <span className="font-semibold">—</span>
                        )}
                        <ClienteDriveLink url={grupo.cliente?.google_drive_url} className="ml-2" />
                        <span className="ml-2 text-xs text-muted">
                          {grupo.cliente?.cnpj ? `${grupo.cliente.cnpj} • ` : ''}
                          {grupo.itens.length} licença(s)
                        </span>
                      </span>
                      <Badge tone={LICENCA_VIGENCIA_TONES[grupo.pior]}>
                        {LICENCA_VIGENCIA_LABELS[grupo.pior]}
                      </Badge>
                    </div>
                  </td>
                </tr>
                {grupo.itens.map(({ licenca, vigencia }) => (
                  <tr key={licenca.id} className="hover:bg-surface-muted/60">
                    <td className="p-4 pl-8">
                      <Link href={`/alvaras/${licenca.id}/editar`} className="block font-medium">
                        {licenca.tipo}
                      </Link>
                    </td>
                    <td className="p-4">
                      <p>{licenca.orgao_emissor ?? '—'}</p>
                      <p className="text-xs text-muted">
                        {[licenca.municipio, licenca.uf].filter(Boolean).join('/')}
                      </p>
                    </td>
                    <td className="p-4">{licenca.numero ?? '—'}</td>
                    <td className="p-4 whitespace-nowrap">
                      {formatarData(licenca.data_vencimento)}
                    </td>
                    <td className="p-4">
                      <Badge tone={LICENCA_VIGENCIA_TONES[vigencia]}>
                        {LICENCA_VIGENCIA_LABELS[vigencia]}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted">
                      <Link href={`/alvaras/${licenca.id}/editar`} aria-label="Abrir licença">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  Nenhuma licença encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
