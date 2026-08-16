'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';

type SimpleTextFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  fieldName: string;
  label: string;
  defaultValue?: string;
  submitLabel: string;
};

const initialState: FormState = { error: null };

export function SimpleTextForm({
  action,
  fieldName,
  label,
  defaultValue,
  submitLabel,
}: SimpleTextFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldName} className="text-sm font-medium">
          {label}
        </label>
        <input
          id={fieldName}
          name={fieldName}
          required
          defaultValue={defaultValue}
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
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
