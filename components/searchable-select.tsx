'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Option = { id: string; label: string; group?: string };

type SearchableSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: string | null;
  placeholder?: string;
  emptyLabel?: string;
  onChange?: (id: string) => void;
};

export function SearchableSelect({
  name,
  options,
  defaultValue,
  placeholder = 'Buscar…',
  emptyLabel = 'Nenhum',
  onChange,
}: SearchableSelectProps) {
  const [selectedId, setSelectedId] = useState(defaultValue ?? '');
  const [query, setQuery] = useState(
    () => options.find((o) => o.id === defaultValue)?.label ?? '',
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(options.find((o) => o.id === selectedId)?.label ?? '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, options, selectedId]);

  const filtradas = useMemo(() => {
    const termo = query.trim().toLowerCase();
    if (!termo) return options;
    return options.filter((o) => o.label.toLowerCase().includes(termo));
  }, [options, query]);

  const grupos = useMemo(() => {
    if (filtradas.every((o) => !o.group)) return [{ titulo: null as string | null, itens: filtradas }];
    const mapa = new Map<string, Option[]>();
    for (const o of filtradas) {
      const chave = o.group ?? '—';
      mapa.set(chave, [...(mapa.get(chave) ?? []), o]);
    }
    return [...mapa.entries()].map(([titulo, itens]) => ({ titulo, itens }));
  }, [filtradas]);

  function escolher(opt: Option | null) {
    setSelectedId(opt?.id ?? '');
    setQuery(opt?.label ?? '');
    setOpen(false);
    onChange?.(opt?.id ?? '');
  }

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={selectedId} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          // Limpa o texto ao focar — sem isso, o valor já preenchido (ex.:
          // responsável padrão) filtra a lista pra só ele mesmo ao abrir,
          // escondendo as outras opções até o usuário apagar manualmente.
          setQuery('');
          setOpen(true);
        }}
        placeholder={placeholder}
        className="input"
        autoComplete="off"
      />
      {open ? (
        <div className="app-card absolute top-full left-0 z-20 mt-1 max-h-56 w-full overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => escolher(null)}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-surface-muted"
          >
            {emptyLabel}
          </button>
          {grupos.map((grupo, i) => (
            <div key={grupo.titulo ?? i}>
              {grupo.titulo ? (
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted uppercase">
                  {grupo.titulo}
                </p>
              ) : null}
              {grupo.itens.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => escolher(opt)}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-muted ${
                    opt.id === selectedId ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
          {filtradas.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">Nada encontrado.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
