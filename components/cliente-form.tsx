'use client';

import { useActionState, useState } from 'react';
import { formatCnpj, isValidCnpj, onlyDigits } from '@/lib/cnpj';
import type { ClienteFormState } from '@/app/(dashboard)/clientes/actions';

type ClienteFormProps = {
  action: (prevState: ClienteFormState, formData: FormData) => Promise<ClienteFormState>;
  initialValues?: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
  };
  submitLabel: string;
};

const initialState: ClienteFormState = { error: null };

export function ClienteForm({ action, initialValues, submitLabel }: ClienteFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [cnpj, setCnpj] = useState(initialValues?.cnpj ?? '');
  const [razaoSocial, setRazaoSocial] = useState(initialValues?.razaoSocial ?? '');
  const [nomeFantasia, setNomeFantasia] = useState(initialValues?.nomeFantasia ?? '');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupPending, setLookupPending] = useState(false);

  const digits = onlyDigits(cnpj);

  async function handleLookup() {
    setLookupError(null);

    if (!isValidCnpj(digits)) {
      setLookupError('CNPJ inválido — confira os dígitos antes de buscar.');
      return;
    }

    setLookupPending(true);
    try {
      const res = await fetch(`/api/cnpj/${digits}`);
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error ?? 'Não foi possível buscar os dados do CNPJ.');
        return;
      }

      setRazaoSocial(data.razaoSocial || razaoSocial);
      setNomeFantasia(data.nomeFantasia || nomeFantasia);
    } catch {
      setLookupError('Não foi possível buscar os dados do CNPJ. Preencha manualmente.');
    } finally {
      setLookupPending(false);
    }
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="cnpj" className="text-sm font-medium">
          CNPJ
        </label>
        <div className="flex gap-2">
          <input
            id="cnpj"
            name="cnpj"
            required
            value={formatCnpj(cnpj)}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            className="w-full rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={lookupPending}
            className="shrink-0 rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-60 dark:border-white/20"
          >
            {lookupPending ? 'Buscando…' : 'Buscar dados'}
          </button>
        </div>
        {lookupError ? <p className="text-sm text-amber-600">{lookupError}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="razao_social" className="text-sm font-medium">
          Razão social
        </label>
        <input
          id="razao_social"
          name="razao_social"
          required
          value={razaoSocial}
          onChange={(e) => setRazaoSocial(e.target.value)}
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="nome_fantasia" className="text-sm font-medium">
          Nome fantasia
        </label>
        <input
          id="nome_fantasia"
          name="nome_fantasia"
          required
          value={nomeFantasia}
          onChange={(e) => setNomeFantasia(e.target.value)}
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {pending ? 'Salvando…' : submitLabel}
      </button>
    </form>
  );
}
