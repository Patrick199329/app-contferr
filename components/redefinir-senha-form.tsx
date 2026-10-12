'use client';

import { useActionState } from 'react';
import type { ResetSenhaFormState } from '@/app/(dashboard)/usuarios/actions';
import { Button } from '@/components/ui/button';

type RedefinirSenhaFormProps = {
  action: (prevState: ResetSenhaFormState, formData: FormData) => Promise<ResetSenhaFormState>;
};

const initialState: ResetSenhaFormState = { error: null };

export function RedefinirSenhaForm({ action }: RedefinirSenhaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="senha" className="text-sm font-medium">
          Nova senha
        </label>
        <input id="senha" name="senha" type="password" required minLength={8} className="input" />
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}
      {state.sucesso ? (
        <p className="text-sm text-status-active">Senha redefinida com sucesso.</p>
      ) : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : 'Redefinir senha'}
      </Button>
    </form>
  );
}
