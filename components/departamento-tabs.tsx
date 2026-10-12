'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Departamento } from '@/types/departamento';

type DepartamentoTabsProps = {
  departamentos: Departamento[];
  ativoId: string;
  basePath: string;
  extraQuery?: string;
};

const PILL_BASE = 'rounded-full px-4 py-2 text-sm font-medium transition-colors';
const PILL_ATIVO = 'bg-accent text-accent-foreground';
const PILL_INATIVO = 'bg-surface-muted text-foreground/70 hover:bg-surface-muted/70';

function pillClass(ativo: boolean) {
  return `${PILL_BASE} ${ativo ? PILL_ATIVO : PILL_INATIVO}`;
}

export function DepartamentoTabs({
  departamentos,
  ativoId,
  basePath,
  extraQuery = '',
}: DepartamentoTabsProps) {
  const topo = departamentos.filter((d) => !d.parent_id);
  const filhosPorPai = new Map<string, Departamento[]>();
  for (const dep of departamentos) {
    if (dep.parent_id) {
      filhosPorPai.set(dep.parent_id, [...(filhosPorPai.get(dep.parent_id) ?? []), dep]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topo.map((dep) => {
        const filhos = filhosPorPai.get(dep.id) ?? [];
        if (filhos.length === 0) {
          return (
            <Link
              key={dep.id}
              href={`${basePath}?departamento=${dep.id}${extraQuery}`}
              className={pillClass(dep.id === ativoId)}
            >
              {dep.nome}
            </Link>
          );
        }
        return (
          <DepartamentoDropdown
            key={dep.id}
            pai={dep}
            filhos={filhos}
            ativoId={ativoId}
            basePath={basePath}
            extraQuery={extraQuery}
          />
        );
      })}
    </div>
  );
}

function DepartamentoDropdown({
  pai,
  filhos,
  ativoId,
  basePath,
  extraQuery,
}: {
  pai: Departamento;
  filhos: Departamento[];
  ativoId: string;
  basePath: string;
  extraQuery: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filhoAtivo = filhos.find((f) => f.id === ativoId);
  const ativo = filhoAtivo !== undefined;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${pillClass(ativo)} flex items-center gap-1.5`}
      >
        {filhoAtivo ? (
          <>
            {pai.nome}
            <span className="opacity-70">:</span> {filhoAtivo.nome}
          </>
        ) : (
          pai.nome
        )}
        <ChevronDown size={14} strokeWidth={2.5} className={open ? 'rotate-180' : ''} />
      </button>
      {open ? (
        <div className="app-card absolute top-full left-0 z-20 mt-2 flex min-w-40 flex-col gap-1 p-2">
          {filhos.map((filho) => (
            <Link
              key={filho.id}
              href={`${basePath}?departamento=${filho.id}${extraQuery}`}
              onClick={() => setOpen(false)}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                filho.id === ativoId
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground/70 hover:bg-surface-muted'
              }`}
            >
              {filho.nome}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
