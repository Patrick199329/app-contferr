'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';
import type { Departamento } from '@/types/departamento';

type DepartamentoFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  departamentosPai: Departamento[];
};

const initialState: FormState = { error: null };

export function DepartamentoForm({ action, departamentosPai }: DepartamentoFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium">
          Nome do departamento
        </label>
        <input id="nome" name="nome" required className="input" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="parent_id" className="text-sm font-medium">
          Departamento pai (opcional)
        </label>
        <select id="parent_id" name="parent_id" defaultValue="" className="input">
          <option value="">Nenhum — departamento independente</option>
          {departamentosPai.map((dep) => (
            <option key={dep.id} value={dep.id}>
              {dep.nome}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Use quando este for um subdepartamento (ex.: &quot;Lucro Real&quot; dentro de
          &quot;Lucro Real/Presumido&quot;). Ele terá suas próprias colunas e tarefas.
        </p>
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : 'Criar departamento'}
      </Button>
    </form>
  );
}
