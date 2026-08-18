'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/usuarios/actions';
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
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
      </div>

      {mode === 'create' ? (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
            />
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
              className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">E-mail</span>
          <span className="text-sm text-black/60 dark:text-white/60">{initialValues?.email}</span>
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
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        >
          <option value="usuario_final">Usuário Final</option>
          <option value="gerente">Gerente</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {pending ? 'Salvando…' : submitLabel}
      </button>
    </form>
  );
}
