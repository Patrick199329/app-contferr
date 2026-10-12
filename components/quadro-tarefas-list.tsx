'use client';

import { Repeat, Search, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { updateQuadroTarefaStatus } from '@/app/(dashboard)/quadro-tarefas/actions';
import { ClienteDriveLink } from '@/components/cliente-drive-link';
import { CHECKLIST_ESTADO_LABELS, type ChecklistEstado } from '@/types/departamento';
import {
  QUADRO_TAREFA_STATUS_LABELS,
  type QuadroTarefa,
  type QuadroTarefaCampo,
  type QuadroTarefaStatus,
} from '@/types/quadro-tarefa';

type Pessoa = { id: string; nome: string; email: string };
type ClienteResumo = { id: string; nome_fantasia: string; google_drive_url?: string | null };
type Chip = { chave: string; label: string; onRemover: () => void };

type QuadroTarefasListProps = {
  tarefas: QuadroTarefa[];
  clientes: ClienteResumo[];
  profiles: Pessoa[];
  campos?: QuadroTarefaCampo[];
};

type AgruparPor = 'nenhum' | 'responsavel' | 'cliente' | 'status';

const TODOS_STATUS = Object.keys(QUADRO_TAREFA_STATUS_LABELS) as QuadroTarefaStatus[];
const STATUS_PADRAO = new Set<QuadroTarefaStatus>(['a_fazer', 'em_andamento']);

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarPrazo(prazo: string | null) {
  return prazo ? new Date(`${prazo}T00:00:00`).toLocaleDateString('pt-BR') : '—';
}

function urgencia(tarefa: QuadroTarefa): { label: string; className: string } {
  if (tarefa.status === 'concluida') {
    return { label: 'Concluída', className: 'bg-status-active/10 text-status-active' };
  }
  if (!tarefa.prazo) {
    return { label: 'Sem prazo', className: 'bg-surface-muted text-muted' };
  }
  const hoje = hojeISO();
  const emDoisDias = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (tarefa.prazo < hoje) {
    return { label: 'Atrasada', className: 'bg-status-inactive/10 text-status-inactive' };
  }
  if (tarefa.prazo <= emDoisDias) {
    return { label: 'Vence em breve', className: 'bg-status-pending/10 text-status-pending' };
  }
  return { label: 'No prazo', className: 'bg-status-active/10 text-status-active' };
}

function toggleNoSet<T>(atual: Set<T>, valor: T): Set<T> {
  const novo = new Set(atual);
  if (novo.has(valor)) novo.delete(valor);
  else novo.add(valor);
  return novo;
}

function formatarDataHora(dataISO: string) {
  return new Date(dataISO).toLocaleDateString('pt-BR');
}

export function QuadroTarefasList({
  tarefas,
  clientes,
  profiles,
  campos = [],
}: QuadroTarefasListProps) {
  const [busca, setBusca] = useState('');
  const [agruparPor, setAgruparPor] = useState<AgruparPor>('nenhum');
  const [statusFiltro, setStatusFiltro] = useState<Set<QuadroTarefaStatus>>(STATUS_PADRAO);
  const [responsavelFiltro, setResponsavelFiltro] = useState<Set<string>>(new Set());
  const [clienteFiltro, setClienteFiltro] = useState<Set<string>>(new Set());
  const [criadorFiltro, setCriadorFiltro] = useState<Set<string>>(new Set());
  const [buscaResponsavel, setBuscaResponsavel] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaCriador, setBuscaCriador] = useState('');
  const [painelAberto, setPainelAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const barraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!painelAberto) return;
    function handleClickOutside(e: MouseEvent) {
      if (barraRef.current && !barraRef.current.contains(e.target as Node)) {
        setPainelAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [painelAberto]);

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

  const nomeResponsavel = (t: QuadroTarefa) =>
    t.responsavel_id ? (pessoaPorId.get(t.responsavel_id) ?? '—') : 'Sem responsável';
  const nomeCriador = (t: QuadroTarefa) => pessoaPorId.get(t.criado_por) ?? '—';
  const nomeCliente = (t: QuadroTarefa) =>
    t.cliente_id ? (clientePorId.get(t.cliente_id) ?? '—') : '—';

  // Formata o valor de um campo personalizado conforme o tipo — mesma ideia
  // de components/tarefa-cell.tsx pra Tabela de Tarefas, aqui só leitura.
  const valorCampo = (campo: QuadroTarefaCampo, tarefa: QuadroTarefa) => {
    const bruto = tarefa.valores?.[campo.id];
    if (!bruto) return '—';
    if (campo.tipo === 'data') return formatarPrazo(bruto);
    if (campo.tipo === 'responsavel') return pessoaPorId.get(bruto) ?? '—';
    if (campo.tipo === 'checklist') return CHECKLIST_ESTADO_LABELS[bruto as ChecklistEstado] ?? bruto;
    return bruto;
  };

  // Sem busca digitada, só mostra quem já está marcado (senão a lista fica
  // enorme com muitos clientes/usuários) — digitar revela o resto.
  const filtrarPessoas = (termo: string, selecionados: Set<string>) => {
    const t = termo.trim().toLowerCase();
    if (!t) return profiles.filter((p) => selecionados.has(p.id));
    return profiles.filter((p) => (p.nome || p.email).toLowerCase().includes(t));
  };
  const responsaveisVisiveis = filtrarPessoas(buscaResponsavel, responsavelFiltro);
  const criadoresVisiveis = filtrarPessoas(buscaCriador, criadorFiltro);
  const clientesVisiveis = buscaCliente.trim()
    ? clientes.filter((c) => c.nome_fantasia.toLowerCase().includes(buscaCliente.trim().toLowerCase()))
    : clientes.filter((c) => clienteFiltro.has(c.id));

  // Conjunto de status vazio ou com todos marcados equivale a "sem filtro" —
  // evita a tela ficar sem nenhuma linha só porque o usuário desmarcou tudo.
  const statusRestringe = statusFiltro.size > 0 && statusFiltro.size < TODOS_STATUS.length;

  const filtradas = useMemo(() => {
    const base = tarefas.filter((t) => {
      if (statusRestringe && !statusFiltro.has(t.status)) return false;
      if (responsavelFiltro.size > 0) {
        if (!t.responsavel_id || !responsavelFiltro.has(t.responsavel_id)) return false;
      }
      if (clienteFiltro.size > 0) {
        if (!t.cliente_id || !clienteFiltro.has(t.cliente_id)) return false;
      }
      if (criadorFiltro.size > 0 && !criadorFiltro.has(t.criado_por)) return false;
      return true;
    });

    const termo = busca.trim().toLowerCase();
    if (!termo) return base;
    return base.filter((t) => {
      const camposBusca = [
        t.titulo,
        t.descricao ?? '',
        nomeResponsavel(t),
        nomeCriador(t),
        nomeCliente(t),
        QUADRO_TAREFA_STATUS_LABELS[t.status],
        `#${t.numero}`,
        ...Object.values(t.valores ?? {}),
      ];
      return camposBusca.some((c) => c.toLowerCase().includes(termo));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tarefas,
    busca,
    statusFiltro,
    statusRestringe,
    responsavelFiltro,
    clienteFiltro,
    criadorFiltro,
    pessoaPorId,
    clientePorId,
  ]);

  const ordenadas = useMemo(
    () =>
      [...filtradas].sort((a, b) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      }),
    [filtradas],
  );

  const grupos = useMemo(() => {
    if (agruparPor === 'nenhum') return [{ titulo: null, itens: ordenadas }];

    const chaveDe = (t: QuadroTarefa) => {
      if (agruparPor === 'responsavel') return t.responsavel_id ?? '__sem__';
      if (agruparPor === 'cliente') return t.cliente_id ?? '__sem__';
      return t.status;
    };
    const rotuloDe = (chave: string, t: QuadroTarefa) => {
      if (agruparPor === 'responsavel') return nomeResponsavel(t);
      if (agruparPor === 'cliente') return nomeCliente(t);
      return QUADRO_TAREFA_STATUS_LABELS[t.status];
    };

    const mapa = new Map<string, QuadroTarefa[]>();
    for (const t of ordenadas) {
      const chave = chaveDe(t);
      mapa.set(chave, [...(mapa.get(chave) ?? []), t]);
    }

    return [...mapa.entries()].map(([chave, itens]) => ({
      titulo: rotuloDe(chave, itens[0]),
      itens,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenadas, agruparPor]);

  function mudarStatus(id: string, status: QuadroTarefaStatus, recorrenciaId: string | null) {
    startTransition(() => {
      updateQuadroTarefaStatus(id, status, recorrenciaId);
    });
  }

  // Chips visíveis na barra — um por filtro ativo, cada um removível na hora
  // sem precisar reabrir o painel.
  const chips: Chip[] = [
    ...(statusRestringe
      ? TODOS_STATUS.filter((s) => statusFiltro.has(s)).map((s) => ({
          chave: `status-${s}`,
          label: QUADRO_TAREFA_STATUS_LABELS[s],
          onRemover: () => setStatusFiltro((prev) => toggleNoSet(prev, s)),
        }))
      : []),
    ...[...responsavelFiltro].map((id) => ({
      chave: `resp-${id}`,
      label: pessoaPorId.get(id) ?? '—',
      onRemover: () => setResponsavelFiltro((prev) => toggleNoSet(prev, id)),
    })),
    ...[...clienteFiltro].map((id) => ({
      chave: `cli-${id}`,
      label: `Cliente: ${clientePorId.get(id) ?? '—'}`,
      onRemover: () => setClienteFiltro((prev) => toggleNoSet(prev, id)),
    })),
    ...[...criadorFiltro].map((id) => ({
      chave: `criador-${id}`,
      label: `Criado por: ${pessoaPorId.get(id) ?? '—'}`,
      onRemover: () => setCriadorFiltro((prev) => toggleNoSet(prev, id)),
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1" ref={barraRef}>
          <div className="input flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span
                key={chip.chave}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium whitespace-nowrap text-accent-foreground"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemover}
                  aria-label={`Remover filtro ${chip.label}`}
                  className="hover:opacity-70"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onFocus={() => setPainelAberto(true)}
              placeholder="Pesquisar…"
              className="min-w-24 flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-muted"
            />
            <Search size={16} strokeWidth={2} className="shrink-0 text-muted" />
          </div>

          {painelAberto ? (
            <div className="app-card absolute top-full left-0 z-20 mt-1 flex w-80 flex-col gap-4 p-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted uppercase">Status</span>
                <div className="flex flex-wrap gap-2">
                  {TODOS_STATUS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFiltro((prev) => toggleNoSet(prev, s))}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        !statusRestringe || statusFiltro.has(s)
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-surface-muted text-foreground/70 hover:bg-surface-muted/70'
                      }`}
                    >
                      {QUADRO_TAREFA_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {profiles.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted uppercase">Responsável</span>
                  <input
                    type="text"
                    value={buscaResponsavel}
                    onChange={(e) => setBuscaResponsavel(e.target.value)}
                    placeholder="Buscar responsável…"
                    className="input py-1.5 text-sm"
                  />
                  <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                    {responsaveisVisiveis.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={responsavelFiltro.has(p.id)}
                          onChange={() => setResponsavelFiltro((prev) => toggleNoSet(prev, p.id))}
                          className="h-4 w-4"
                        />
                        {p.nome || p.email}
                      </label>
                    ))}
                    {responsaveisVisiveis.length === 0 ? (
                      <p className="text-sm text-muted">
                        {buscaResponsavel.trim() ? 'Nada encontrado.' : 'Digite para buscar…'}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {clientes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted uppercase">Cliente</span>
                  <input
                    type="text"
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder="Buscar cliente…"
                    className="input py-1.5 text-sm"
                  />
                  <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                    {clientesVisiveis.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={clienteFiltro.has(c.id)}
                          onChange={() => setClienteFiltro((prev) => toggleNoSet(prev, c.id))}
                          className="h-4 w-4"
                        />
                        {c.nome_fantasia}
                      </label>
                    ))}
                    {clientesVisiveis.length === 0 ? (
                      <p className="text-sm text-muted">
                        {buscaCliente.trim() ? 'Nada encontrado.' : 'Digite para buscar…'}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {profiles.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted uppercase">Criado por</span>
                  <input
                    type="text"
                    value={buscaCriador}
                    onChange={(e) => setBuscaCriador(e.target.value)}
                    placeholder="Buscar…"
                    className="input py-1.5 text-sm"
                  />
                  <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                    {criadoresVisiveis.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={criadorFiltro.has(p.id)}
                          onChange={() => setCriadorFiltro((prev) => toggleNoSet(prev, p.id))}
                          className="h-4 w-4"
                        />
                        {p.nome || p.email}
                      </label>
                    ))}
                    {criadoresVisiveis.length === 0 ? (
                      <p className="text-sm text-muted">
                        {buscaCriador.trim() ? 'Nada encontrado.' : 'Digite para buscar…'}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="agrupar" className="text-muted">
            Agrupar por
          </label>
          <select
            id="agrupar"
            value={agruparPor}
            onChange={(e) => setAgruparPor(e.target.value as AgruparPor)}
            className="input w-auto"
          >
            <option value="nenhum">Nenhum</option>
            <option value="responsavel">Responsável</option>
            <option value="cliente">Cliente</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="app-table w-full min-w-max border-collapse">
          <thead>
            <tr>
              <th>Status</th>
              <th>Tarefa</th>
              <th>Prazo</th>
              <th>Responsável</th>
              <th>Criado por</th>
              <th>Criado em</th>
              <th>Cliente</th>
              {campos.map((campo) => (
                <th key={campo.id}>{campo.nome}</th>
              ))}
              <th>Nº</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo, gi) => (
              <Fragment key={grupo.titulo ?? gi}>
                {grupo.titulo ? (
                  <tr>
                    <td
                      colSpan={8 + campos.length}
                      className="bg-surface-muted/60 text-xs font-medium text-muted uppercase"
                    >
                      {grupo.titulo}
                    </td>
                  </tr>
                ) : null}
                {grupo.itens.map((tarefa) => {
                  const u = urgencia(tarefa);
                  return (
                    <tr key={tarefa.id}>
                      <td>
                        <select
                          value={tarefa.status}
                          disabled={isPending}
                          onChange={(e) =>
                            mudarStatus(
                              tarefa.id,
                              e.target.value as QuadroTarefaStatus,
                              tarefa.recorrencia_id,
                            )
                          }
                          className="input w-auto"
                        >
                          {Object.entries(QUADRO_TAREFA_STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="max-w-64">
                        <Link
                          href={`/quadro-tarefas/${tarefa.id}/editar`}
                          className="inline-flex items-center gap-1.5 font-medium hover:underline"
                        >
                          {tarefa.recorrencia_id ? (
                            <Repeat size={13} strokeWidth={2.5} className="shrink-0 text-muted" />
                          ) : null}
                          {tarefa.titulo}
                        </Link>
                        <p className="mt-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${u.className}`}
                          >
                            {u.label}
                          </span>
                        </p>
                      </td>
                      <td className="whitespace-nowrap">{formatarPrazo(tarefa.prazo)}</td>
                      <td className="whitespace-nowrap">{nomeResponsavel(tarefa)}</td>
                      <td className="whitespace-nowrap text-muted">{nomeCriador(tarefa)}</td>
                      <td className="whitespace-nowrap text-muted">{formatarDataHora(tarefa.created_at)}</td>
                      <td className="whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {nomeCliente(tarefa)}
                          {tarefa.cliente_id ? (
                            <ClienteDriveLink url={driveUrlPorClienteId.get(tarefa.cliente_id)} />
                          ) : null}
                        </span>
                      </td>
                      {campos.map((campo) => (
                        <td key={campo.id} className="whitespace-nowrap">
                          {valorCampo(campo, tarefa)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap text-muted">#{tarefa.numero}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {ordenadas.length === 0 ? (
              <tr>
                <td colSpan={8 + campos.length} className="p-4 text-center text-muted">
                  Nenhuma tarefa encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
