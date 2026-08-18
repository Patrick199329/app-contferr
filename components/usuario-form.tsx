'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/usuarios/actions';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/supabase/profile';

type UsuarioFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  mode: 'create' | 'edit';
  initialValues?: {
    nome: string;
    email: string;
    role: Role;
  };
  submitLabel: string;
};

const initialState: FormState = { error: null };

export function UsuarioForm({ action, mode, initialValues, submitLabel }: UsuarioFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={initialValues?.nome}
          className="input"
        />
      </div>

      {mode === 'create' ? (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input id="email" name="email" type="email" required className="input" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium">
              Senha inicial
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              minLength={8}
              className="input"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">E-mail</span>
          <span className="text-sm text-muted">{initialValues?.email}</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          Perfil
        </label>
        <select
          id="role"
          name="role"
          defaultValue={initialValues?.role ?? 'usuario_final'}
          className="input"
        >
          <option value="usuario_final">Usuário Final</option>
          <option value="gerente">Gerente</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}
