'use client';

import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AUDIT_OPERACAO_LABELS,
  AUDIT_OPERACAO_TONES,
  AUDIT_TABELA_LABELS,
  type AuditLog,
  type AuditOperacao,
} from '@/types/audit';

type Pessoa = { id: string; nome: string; email: string };

type AuditLogListProps = {
  eventos: AuditLog[];
  usuarios: Pessoa[];
};

// Snapshot já guardado no próprio evento — evita um join extra só pra
// mostrar "quem"/"o quê" foi afetado num insert/update de profiles.
function descricaoRegistro(evento: AuditLog): string | null {
  const dados = evento.dados_novos ?? evento.dados_antigos;
  if (!dados) return null;
  const nome = dados.nome ?? dados.email ?? dados.nome_fantasia ?? dados.titulo;
  return typeof nome === 'string' && nome ? nome : null;
}

export function AuditLogList({ eventos, usuarios }: AuditLogListProps) {
  const [busca, setBusca] = useState('');
  const [tabelaFiltro, setTabelaFiltro] = useState('todas');
  const [operacaoFiltro, setOperacaoFiltro] = useState<'todas' | AuditOperacao>('todas');
  const [expandido, setExpandido] = useState<string | null>(null);

  const nomePorId = useMemo(
    () => new Map(usuarios.map((u) => [u.id, u.nome || u.email])),
    [usuarios],
  );

  const tabelasDisponiveis = useMemo(
    () => [...new Set(eventos.map((e) => e.tabela))].sort(),
    [eventos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return eventos.filter((e) => {
      if (tabelaFiltro !== 'todas' && e.tabela !== tabelaFiltro) return false;
      if (operacaoFiltro !== 'todas' && e.operacao !== operacaoFiltro) return false;
      if (!termo) return true;
      const textos = [
        nomePorId.get(e.usuario_id ?? '') ?? '',
        AUDIT_TABELA_LABELS[e.tabela] ?? e.tabela,
        descricaoRegistro(e) ?? '',
      ];
      return textos.some((t) => t.toLowerCase().includes(termo));
    });
  }, [eventos, busca, tabelaFiltro, operacaoFiltro, nomePorId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por pessoa ou registro…"
          className="input max-w-sm"
        />
        <select
          value={tabelaFiltro}
          onChange={(e) => setTabelaFiltro(e.target.value)}
          className="input w-auto"
          aria-label="Filtrar por tabela"
        >
          <option value="todas">Todas as áreas</option>
          {tabelasDisponiveis.map((t) => (
            <option key={t} value={t}>
              {AUDIT_TABELA_LABELS[t] ?? t}
            </option>
          ))}
        </select>
        <select
          value={operacaoFiltro}
          onChange={(e) => setOperacaoFiltro(e.target.value as 'todas' | AuditOperacao)}
          className="input w-auto"
          aria-label="Filtrar por tipo de evento"
        >
          <option value="todas">Todos os tipos</option>
          {(Object.entries(AUDIT_OPERACAO_LABELS) as [AuditOperacao, string][]).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">{filtrados.length} evento(s)</span>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="app-table w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Quem</th>
              <th>Tipo</th>
              <th>Área</th>
              <th>Registro</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) => {
              const temDetalhe = Boolean(e.dados_antigos || e.dados_novos);
              const aberto = expandido === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    className={temDetalhe ? 'cursor-pointer hover:bg-surface-muted/60' : undefined}
                    onClick={() => temDetalhe && setExpandido(aberto ? null : e.id)}
                  >
                    <td className="whitespace-nowrap text-sm">
                      {new Date(e.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {e.usuario_id ? (nomePorId.get(e.usuario_id) ?? '—') : 'Sistema'}
                    </td>
                    <td>
                      <Badge tone={AUDIT_OPERACAO_TONES[e.operacao]}>
                        {AUDIT_OPERACAO_LABELS[e.operacao]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {AUDIT_TABELA_LABELS[e.tabela] ?? e.tabela}
                    </td>
                    <td className="text-sm text-muted">{descricaoRegistro(e) ?? '—'}</td>
                    <td className="text-xs text-muted">{temDetalhe ? (aberto ? '▲' : '▼') : ''}</td>
                  </tr>
                  {aberto ? (
                    <tr>
                      <td colSpan={6} className="bg-surface-muted/40 p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {e.dados_antigos ? (
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted uppercase">Antes</p>
                              <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-xs">
                                {JSON.stringify(e.dados_antigos, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                          {e.dados_novos ? (
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted uppercase">Depois</p>
                              <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-xs">
                                {JSON.stringify(e.dados_novos, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">
                  Nenhum evento encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
