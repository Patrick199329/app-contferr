'use client';

import { useActionState } from 'react';
import type { EditarEmailFormState } from '@/app/(dashboard)/usuarios/actions';
import { Button } from '@/components/ui/button';

type EditarEmailFormProps = {
  action: (prevState: EditarEmailFormState, formData: FormData) => Promise<EditarEmailFormState>;
  emailAtual: string;
};

const initialState: EditarEmailFormState = { error: null };

export function EditarEmailForm({ action, emailAtual }: EditarEmailFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={emailAtual}
          className="input"
        />
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}
      {state.sucesso ? <p className="text-sm text-status-active">E-mail atualizado.</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : 'Salvar e-mail'}
      </Button>
    </form>
  );
}
