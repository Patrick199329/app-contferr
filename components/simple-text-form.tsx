'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';

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
          className="input"
        />
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}
