'use client';

import { Fragment, useState } from 'react';
import type { Departamento } from '@/types/departamento';

type DepartamentosPickerProps = {
  departamentos: Departamento[];
  defaultSelected?: string[];
};

export function DepartamentosPicker({
  departamentos,
  defaultSelected = [],
}: DepartamentosPickerProps) {
  // Guarda o estado real de cada checkbox (pai e filho), independente de um
  // filho estar "escondido" atrás do pai marcado no momento — assim, se o
  // pai for desmarcado depois, o filho volta a mostrar o que ele realmente
  // tinha antes, em vez de sempre voltar desmarcado.
  const [marcados, setMarcados] = useState<Set<string>>(new Set(defaultSelected));

  const topo = departamentos.filter((d) => !d.parent_id);
  const filhosPorPai = new Map<string, Departamento[]>();
  for (const dep of departamentos) {
    if (dep.parent_id) {
      filhosPorPai.set(dep.parent_id, [...(filhosPorPai.get(dep.parent_id) ?? []), dep]);
    }
  }

  function alternar(id: string) {
    setMarcados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">Departamentos e subdepartamentos</span>
      <p className="text-xs text-muted">
        Marcar um departamento pai libera automaticamente os subdepartamentos dele. O usuário só
        vai ver e editar o que for marcado aqui.
      </p>
      <div className="app-card flex flex-col divide-y divide-border">
        {topo.map((dep) => {
          const paiMarcado = marcados.has(dep.id);
          return (
            <Fragment key={dep.id}>
              <label className="flex items-center gap-2 p-3 text-sm">
                <input
                  type="checkbox"
                  name="departamentos"
                  value={dep.id}
                  checked={paiMarcado}
                  onChange={() => alternar(dep.id)}
                />
                {dep.nome}
              </label>
              {(filhosPorPai.get(dep.id) ?? []).map((filho) => {
                // Herdado do pai: aparece marcado e travado, sem submeter o
                // próprio valor (input disabled não entra no FormData) — o
                // pai já cobre o acesso, não precisa de uma linha extra.
                const herdado = paiMarcado;
                const marcadoIndividualmente = marcados.has(filho.id);
                return (
                  <label
                    key={filho.id}
                    className={`flex items-center gap-2 p-3 pl-8 text-sm ${herdado ? 'text-muted' : ''}`}
                  >
                    <input
                      type="checkbox"
                      name="departamentos"
                      value={filho.id}
                      checked={herdado || marcadoIndividualmente}
                      disabled={herdado}
                      onChange={() => alternar(filho.id)}
                    />
                    ↳ {filho.nome}
                    {herdado ? <span className="text-xs">(herdado do pai)</span> : null}
                  </label>
                );
              })}
            </Fragment>
          );
        })}
        {departamentos.length === 0 ? (
          <p className="p-3 text-sm text-muted">Nenhum departamento cadastrado ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
