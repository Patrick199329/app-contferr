'use client';

import { useState } from 'react';
import { updateFuncionario } from '@/app/(dashboard)/clientes/actions';
import { FuncionarioForm } from '@/components/funcionario-form';
import type { Funcionario } from '@/types/funcionario';

type FuncionarioItemProps = {
  clienteId: string;
  funcionario: Funcionario;
  toggleStatusAction: () => Promise<void>;
  clienteNome?: string;
  clienteCpf?: string | null;
};

export function FuncionarioItem({
  clienteId,
  funcionario,
  toggleStatusAction,
  clienteNome,
  clienteCpf,
}: FuncionarioItemProps) {
  const [editando, setEditando] = useState(false);

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{funcionario.nome}</span>
          {funcionario.cpf ? (
            <span className="ml-2 text-sm text-muted">{funcionario.cpf}</span>
          ) : null}
          {funcionario.status === 'inativo' ? (
            <span className="ml-2 text-xs text-status-inactive">Inativo</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="text-sm text-muted hover:underline"
          >
            {editando ? 'Fechar' : 'Editar'}
          </button>
          <form action={toggleStatusAction}>
            <button type="submit" className="text-sm text-muted hover:underline">
              {funcionario.status === 'ativo' ? 'Desativar' : 'Reativar'}
            </button>
          </form>
        </div>
      </div>

      {editando ? (
        <FuncionarioForm
          action={updateFuncionario.bind(null, funcionario.id, clienteId)}
          initialValues={{
            nome: funcionario.nome,
            cpf: funcionario.cpf,
          }}
          submitLabel="Salvar alterações"
          clienteNome={clienteNome}
          clienteCpf={clienteCpf}
        />
      ) : null}
    </li>
  );
}
