'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';

type FerramentasDepartamentoFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  usaTarefasPadrao: boolean;
  usaQuadroTarefas: boolean;
  usaFuncionarios: boolean;
  usaProcessos: boolean;
  usaAlvaras: boolean;
  usaParcelamentos: boolean;
  usaCorresponsavel: boolean;
};

const initialState: FormState = { error: null };

export function FerramentasDepartamentoForm({
  action,
  usaTarefasPadrao,
  usaQuadroTarefas,
  usaFuncionarios,
  usaProcessos,
  usaAlvaras,
  usaParcelamentos,
  usaCorresponsavel,
}: FerramentasDepartamentoFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="usa_tarefas_padrao"
          defaultChecked={usaTarefasPadrao}
          className="h-4 w-4"
        />
        <span>
          <span className="font-medium">Tabela de Tarefas</span>
          <span className="block text-xs text-muted">
            Checklist mensal recorrente por cliente e coluna configurável.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="usa_quadro_tarefas"
          defaultChecked={usaQuadroTarefas}
          className="h-4 w-4"
        />
        <span>
          <span className="font-medium">Tarefas Avulsas</span>
          <span className="block text-xs text-muted">
            Tarefas avulsas com prazo, responsável e vínculo opcional com cliente.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="usa_funcionarios"
          defaultChecked={usaFuncionarios}
          className="h-4 w-4"
        />
        <span>
          <span className="font-medium">Funcionários por cliente</span>
          <span className="block text-xs text-muted">
            Cadastro de funcionários (nome e CPF) e credenciais de acesso a portais do governo, na
            ficha do cliente — não afeta a Tabela de Tarefas, que continua 1 linha por cliente.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="usa_processos"
          defaultChecked={usaProcessos}
          className="h-4 w-4"
        />
        <span>
          <span className="font-medium">Processos</span>
          <span className="block text-xs text-muted">
            Controle de processos com etapas fixas por tipo de serviço (ex.: abertura, alteração,
            baixa) e controle de taxas JUCEMG vinculado a etapas específicas.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input type="checkbox" name="usa_alvaras" defaultChecked={usaAlvaras} className="h-4 w-4" />
        <span>
          <span className="font-medium">Alvarás e licenças</span>
          <span className="block text-xs text-muted">
            Controle de alvarás e licenças por cliente, com órgão emissor, vigência, vencimento e
            configuração da taxa anual.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="usa_parcelamentos"
          defaultChecked={usaParcelamentos}
          className="h-4 w-4"
        />
        <span>
          <span className="font-medium">Parcelamentos</span>
          <span className="block text-xs text-muted">
            Controle mensal de parcelamentos por cliente (RFB, PGFN, Estado, Município, portais)
            com guia enviada, pago e geração automática da guia do mês.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="usa_corresponsavel"
          defaultChecked={usaCorresponsavel}
          className="h-4 w-4"
        />
        <span>
          <span className="font-medium">Corresponsável por cliente</span>
          <span className="block text-xs text-muted">
            Na Tabela de Tarefas, permite marcar uma coluna de Responsável como corresponsável. Quem
            for marcado vê esses clientes no filtro &quot;Sou corresponsável&quot; e em Minhas
            pendências. Só vale pra este departamento.
          </span>
        </span>
      </label>

      {state.error ?<p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : 'Salvar ferramentas'}
      </Button>
    </form>
  );
}
