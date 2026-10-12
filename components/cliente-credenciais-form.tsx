'use client';

import { useActionState, useState } from 'react';
import type { ClienteCredenciaisFormState } from '@/app/(dashboard)/clientes/actions';
import { Button } from '@/components/ui/button';

type ClienteCredenciaisFormProps = {
  action: (
    prevState: ClienteCredenciaisFormState,
    formData: FormData,
  ) => Promise<ClienteCredenciaisFormState>;
  initialValues: {
    senhaGov: string | null;
    codigoAcesso: string | null;
    senha: string | null;
  };
};

const initialState: ClienteCredenciaisFormState = { error: null };

function CampoSensivel({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string | null;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          name={name}
          type={visivel ? 'text' : 'password'}
          defaultValue={defaultValue ?? ''}
          autoComplete="off"
          className="input"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="whitespace-nowrap text-xs text-muted hover:underline"
        >
          {visivel ? 'Esconder' : 'Mostrar'}
        </button>
      </div>
    </div>
  );
}

export function ClienteCredenciaisForm({ action, initialValues }: ClienteCredenciaisFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <CampoSensivel
        id="cliente-senha-gov"
        name="senha_gov"
        label="Senha gov.br"
        defaultValue={initialValues.senhaGov}
      />
      <CampoSensivel
        id="cliente-codigo-acesso"
        name="codigo_acesso"
        label="Código de acesso"
        defaultValue={initialValues.codigoAcesso}
      />
      <CampoSensivel
        id="cliente-senha"
        name="senha"
        label="Senha"
        defaultValue={initialValues.senha}
      />

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}
      {state.sucesso ? <p className="text-sm text-status-active">Credenciais salvas.</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : 'Salvar credenciais'}
      </Button>
    </form>
  );
}
