'use client';

import { useActionState, useState } from 'react';
import type { FuncionarioFormState } from '@/app/(dashboard)/clientes/actions';
import { Button } from '@/components/ui/button';

type FuncionarioFormProps = {
  action: (prevState: FuncionarioFormState, formData: FormData) => Promise<FuncionarioFormState>;
  initialValues?: {
    nome: string;
    cpf: string | null;
  };
  submitLabel?: string;
  // Preenche Nome/CPF com os dados do próprio cliente (razão social + CPF do
  // cadastro, exibidos mais acima na mesma tela) — usado quando o cliente é
  // pessoa física e é ele mesmo o funcionário (ex.: empregador doméstico que
  // também consta como o próprio empregado), pra não redigitar.
  clienteNome?: string;
  clienteCpf?: string | null;
};

const initialState: FuncionarioFormState = { error: null };

export function FuncionarioForm({
  action,
  initialValues,
  submitLabel,
  clienteNome,
  clienteCpf,
}: FuncionarioFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [nome, setNome] = useState(initialValues?.nome ?? '');
  const [cpf, setCpf] = useState(initialValues?.cpf ?? '');

  function usarClientePrincipal() {
    if (clienteNome) setNome(clienteNome);
    if (clienteCpf) setCpf(clienteCpf);
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {clienteNome ? (
        <button
          type="button"
          onClick={usarClientePrincipal}
          className="w-fit rounded-full border border-border px-3 py-1 text-xs text-muted hover:underline"
        >
          Cliente principal
        </button>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="funcionario-nome" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="funcionario-nome"
          name="nome"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="funcionario-cpf" className="text-sm font-medium">
          CPF
        </label>
        <input
          id="funcionario-cpf"
          name="cpf"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          className="input"
        />
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : (submitLabel ?? 'Adicionar funcionário')}
      </Button>
    </form>
  );
}
