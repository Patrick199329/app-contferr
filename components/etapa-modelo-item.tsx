'use client';

import { useState } from 'react';
import { updateEtapaModelo } from '@/app/(dashboard)/departamentos/actions';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { EtapaModeloForm } from '@/components/etapa-modelo-form';
import { Badge } from '@/components/ui/badge';
import type { EtapaModelo } from '@/types/processo';

type EtapaModeloItemProps = {
  departamentoId: string;
  tipoProcessoId: string;
  etapa: EtapaModelo;
  podeSubir: boolean;
  podeDescer: boolean;
  semMovimentacao: boolean;
  moveUpAction: () => Promise<void>;
  moveDownAction: () => Promise<void>;
  toggleStatusAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
};

export function EtapaModeloItem({
  departamentoId,
  tipoProcessoId,
  etapa,
  podeSubir,
  podeDescer,
  semMovimentacao,
  moveUpAction,
  moveDownAction,
  toggleStatusAction,
  deleteAction,
}: EtapaModeloItemProps) {
  const [editando, setEditando] = useState(false);

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          {etapa.nome}
          {etapa.trava_por_taxa_jucemg ? <Badge tone="pending">trava por Taxa JUCEMG</Badge> : null}
          {etapa.status === 'inativo' ? <Badge tone="inactive">inativa</Badge> : null}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="text-sm text-muted hover:underline"
          >
            {editando ? 'Fechar' : 'Editar'}
          </button>
          {etapa.status === 'ativo' ? (
            <>
              <form action={moveUpAction}>
                <button
                  type="submit"
                  disabled={!podeSubir}
                  className="text-sm text-muted hover:underline disabled:opacity-30"
                >
                  Subir
                </button>
              </form>
              <form action={moveDownAction}>
                <button
                  type="submit"
                  disabled={!podeDescer}
                  className="text-sm text-muted hover:underline disabled:opacity-30"
                >
                  Descer
                </button>
              </form>
            </>
          ) : null}
          <form action={toggleStatusAction}>
            <button type="submit" className="text-sm text-muted hover:underline">
              {etapa.status === 'ativo' ? 'Desativar' : 'Reativar'}
            </button>
          </form>
          {semMovimentacao ? (
            <ConfirmFormButton
              action={deleteAction}
              confirmMessage={`Excluir a etapa "${etapa.nome}"? Ela nunca foi usada em nenhum processo. Essa ação não pode ser desfeita.`}
              className="text-sm text-status-inactive hover:underline"
            >
              Excluir
            </ConfirmFormButton>
          ) : null}
        </div>
      </div>

      {editando ? (
        <EtapaModeloForm
          action={updateEtapaModelo.bind(null, departamentoId, tipoProcessoId, etapa.id)}
          initialValues={{ nome: etapa.nome, travaPorTaxaJucemg: etapa.trava_por_taxa_jucemg }}
          submitLabel="Salvar alterações"
        />
      ) : null}
    </li>
  );
}
