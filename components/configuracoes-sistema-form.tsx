'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/admin/configuracoes/actions';
import { Button } from '@/components/ui/button';

type ConfiguracoesSistemaFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  mesesAtual: number;
};

const initialState: FormState = { error: null };

export function ConfiguracoesSistemaForm({ action, mesesAtual }: ConfiguracoesSistemaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="tarefas-meses-retroativos" className="text-sm font-medium">
          Tabela de Tarefas — meses anteriores editáveis
        </label>
        <input
          id="tarefas-meses-retroativos"
          name="tarefas_meses_edicao_retroativa"
          type="number"
          min={0}
          defaultValue={mesesAtual}
          className="input w-32"
        />
        <span className="text-xs text-muted">
          0 = só o mês corrente (padrão). Ex.: 2 libera editar o mês corrente e os 2 anteriores.
          Meses fora dessa janela continuam disponíveis, só leitura, em Histórico.
        </span>
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}
      {state.sucesso ? <p className="text-sm text-status-active">Configuração salva.</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  );
}
