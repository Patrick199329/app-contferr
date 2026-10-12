'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ClienteDriveLink } from '@/components/cliente-drive-link';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { Badge } from '@/components/ui/badge';
import { formatDocumento, onlyDigits } from '@/lib/cnpj';
import type { Cliente } from '@/types/cliente';

const SEM_DEPARTAMENTO = '__sem_departamento__';

export type ClienteListItem = Cliente & {
  departamentoIds: string[];
  departamentoNomes: string[];
  semMovimentacao: boolean;
};

type DepartamentoOpcao = { id: string; nome: string; parent_id: string | null };

type Chip = { chave: string; label: string; onRemover: () => void };

type ClientesListProps = {
  clientes: ClienteListItem[];
  departamentos: DepartamentoOpcao[];
  podeGerenciar: boolean;
  showInativos: boolean;
  deleteCliente: (id: string) => Promise<void>;
  setClienteStatus: (id: string, status: 'ativo' | 'inativo') => Promise<void>;
};

function toggleNoSet<T>(atual: Set<T>, valor: T): Set<T> {
  const novo = new Set(atual);
  if (novo.has(valor)) novo.delete(valor);
  else novo.add(valor);
  return novo;
}

export function ClientesList({
  clientes,
  departamentos,
  podeGerenciar,
  showInativos,
  deleteCliente,
  setClienteStatus,
}: ClientesListProps) {
  const [busca, setBusca] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState<Set<string>>(new Set());
  const [painelAberto, setPainelAberto] = useState(false);
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

  const nomeDepPorId = useMemo(
    () => new Map(departamentos.map((d) => [d.id, d.nome])),
    [departamentos],
  );

  // `ordem` é relativo aos irmãos dentro do mesmo pai (repete entre grupos
  // diferentes, ex.: dois departamentos podem ter ordem=0) — ordenar a lista
  // toda só por `ordem` intercala filhos antes do próprio pai, fazendo um
  // filho aparecer "encostado" embaixo de um item sem relação nenhuma (como
  // aconteceu com "Simples"/"Divisão" logo abaixo de "Sem departamento").
  // Agrupa de verdade: cada pai seguido só dos seus próprios filhos, mesmo
  // critério já usado em components/departamento-tabs.tsx.
  const departamentosOrdenados = useMemo(() => {
    const idsExistentes = new Set(departamentos.map((d) => d.id));
    const topo = departamentos.filter((d) => !d.parent_id);
    const filhosPorPai = new Map<string, DepartamentoOpcao[]>();
    for (const dep of departamentos) {
      if (dep.parent_id && idsExistentes.has(dep.parent_id)) {
        filhosPorPai.set(dep.parent_id, [...(filhosPorPai.get(dep.parent_id) ?? []), dep]);
      }
    }
    // Filho cujo pai não está na lista (ex.: pai inativo) não pode ficar de
    // fora do filtro — entra no fim, sem indentação, como se fosse de topo.
    const orfaos = departamentos.filter(
      (d) => d.parent_id && !idsExistentes.has(d.parent_id),
    );
    return [...topo.flatMap((dep) => [dep, ...(filhosPorPai.get(dep.id) ?? [])]), ...orfaos];
  }, [departamentos]);

  const filtrados = useMemo(() => {
    const semDepartamentoAtivo = departamentoFiltro.has(SEM_DEPARTAMENTO);
    const departamentosSelecionados = new Set(
      [...departamentoFiltro].filter((id) => id !== SEM_DEPARTAMENTO),
    );
    const restringeDepartamento = semDepartamentoAtivo || departamentosSelecionados.size > 0;

    const base = clientes.filter((c) => {
      if (!restringeDepartamento) return true;
      if (semDepartamentoAtivo && c.departamentoIds.length === 0) return true;
      return c.departamentoIds.some((id) => departamentosSelecionados.has(id));
    });

    const termo = busca.trim().toLowerCase();
    if (!termo) return base;
    const termoDigits = onlyDigits(busca);
    return base.filter((c) => {
      const camposTexto = [
        c.nome_fantasia,
        c.razao_social,
        c.codigo ?? '',
        c.inscricao_estadual ?? '',
        c.tipo_calculo_ir ?? '',
        c.telefone ?? '',
        c.endereco ?? '',
        c.complemento ?? '',
        c.bairro ?? '',
        c.cidade ?? '',
        c.uf ?? '',
        c.cep ?? '',
      ];
      if (camposTexto.some((v) => v.toLowerCase().includes(termo))) return true;
      return termoDigits.length > 0 && c.cnpj.includes(termoDigits);
    });
  }, [clientes, busca, departamentoFiltro]);

  const chips: Chip[] = [...departamentoFiltro].map((id) => ({
    chave: id,
    label: id === SEM_DEPARTAMENTO ? 'Sem departamento' : (nomeDepPorId.get(id) ?? '—'),
    onRemover: () => setDepartamentoFiltro((prev) => toggleNoSet(prev, id)),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="relative" ref={barraRef}>
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
            placeholder="Buscar por nome, razão social, CNPJ, código, endereço, telefone…"
            className="min-w-40 flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-muted"
          />
          <Search size={16} strokeWidth={2} className="shrink-0 text-muted" />
        </div>

        {painelAberto && departamentos.length > 0 ? (
          <div className="app-card absolute top-full left-0 z-20 mt-1 flex w-80 flex-col gap-2 p-4">
            <span className="text-xs font-medium text-muted uppercase">
              Departamento / Subdepartamento
            </span>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={departamentoFiltro.has(SEM_DEPARTAMENTO)}
                  onChange={() =>
                    setDepartamentoFiltro((prev) => toggleNoSet(prev, SEM_DEPARTAMENTO))
                  }
                  className="h-4 w-4"
                />
                Sem departamento
              </label>
              {departamentosOrdenados.map((dep) => (
                <label
                  key={dep.id}
                  className={`flex items-center gap-2 text-sm ${dep.parent_id ? 'pl-4' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={departamentoFiltro.has(dep.id)}
                    onChange={() => setDepartamentoFiltro((prev) => toggleNoSet(prev, dep.id))}
                    className="h-4 w-4"
                  />
                  {dep.parent_id ? '↳ ' : ''}
                  {dep.nome}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <ul className="app-card flex flex-col divide-y divide-border">
        {filtrados.map((cliente) => (
          <li key={cliente.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <span className="flex items-center gap-1.5">
                <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                  {cliente.nome_fantasia}
                </Link>
                <ClienteDriveLink url={cliente.google_drive_url} />
              </span>
              <p className="truncate text-sm text-muted">
                {cliente.razao_social} —{' '}
                {cliente.codigo ? `${cliente.codigo} — ` : ''}
                {formatDocumento(cliente.cnpj)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {cliente.departamentoNomes.length > 0 ? (
                  cliente.departamentoNomes.map((d) => (
                    <Badge key={d} tone="neutral">
                      {d}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted">Nenhum departamento vinculado</span>
                )}
              </div>
            </div>
            {podeGerenciar ? (
              <div className="flex shrink-0 gap-3">
                <Link
                  href={`/clientes/${cliente.id}/editar`}
                  className="text-sm text-muted hover:underline"
                >
                  Editar
                </Link>
                <form action={setClienteStatus.bind(null, cliente.id, showInativos ? 'ativo' : 'inativo')}>
                  <button type="submit" className="text-sm text-muted hover:underline">
                    {showInativos ? 'Reativar' : 'Desativar'}
                  </button>
                </form>
                {cliente.semMovimentacao ? (
                  <ConfirmFormButton
                    action={deleteCliente.bind(null, cliente.id)}
                    confirmMessage={`Excluir "${cliente.nome_fantasia}"? Ele não tem nenhuma movimentação registrada. Essa ação não pode ser desfeita.`}
                    className="text-sm text-status-inactive hover:underline"
                  >
                    Excluir
                  </ConfirmFormButton>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
        {filtrados.length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum cliente encontrado.</li>
        ) : null}
      </ul>
    </div>
  );
}
