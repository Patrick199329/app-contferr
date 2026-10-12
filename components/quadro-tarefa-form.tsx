'use client';

import { useActionState, useState } from 'react';
import type { FormState } from '@/app/(dashboard)/quadro-tarefas/actions';
import { ChecklistEstadoPicker } from '@/components/checklist-estado-picker';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import type { QuadroTarefaCampo } from '@/types/quadro-tarefa';

// O formulário inteiro só é enviado no submit (sem autosave por campo), então
// o checklist precisa guardar o estado localmente e refletir num input
// escondido pra viajar junto no FormData — os outros tipos usam <select>/
// <input> nativos que já fazem isso sozinhos.
function CampoChecklistInput({ nome, valorInicial }: { nome: string; valorInicial: string }) {
  const [valor, setValor] = useState(valorInicial);
  return (
    <>
      <input type="hidden" name={nome} value={valor} />
      <ChecklistEstadoPicker value={valor} onSelect={setValor} />
    </>
  );
}

type QuadroTarefaFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  clientesDisponiveis: { id: string; nome_fantasia: string }[];
  membros: MembroDepartamento[];
  campos?: QuadroTarefaCampo[];
  opcoesPorCampo?: Record<string, string[]>;
  responsavelPadraoPorCliente?: Record<string, string | null>;
  // Só relevante editando uma tarefa que pertence a uma recorrência ainda
  // ativa — libera a opção de atualizar o molde junto com a tarefa.
  recorrenciaAtiva?: boolean;
  initialValues?: {
    titulo: string;
    descricao: string | null;
    responsavelId: string | null;
    clienteId: string | null;
    prazo: string | null;
    valores?: Record<string, string>;
  };
  defaultResponsavelId?: string;
  submitLabel: string;
};

const initialState: FormState = { error: null };

export function QuadroTarefaForm({
  action,
  clientesDisponiveis,
  membros,
  campos = [],
  opcoesPorCampo = {},
  responsavelPadraoPorCliente = {},
  initialValues,
  defaultResponsavelId,
  recorrenciaAtiva = false,
  submitLabel,
}: QuadroTarefaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [recorrente, setRecorrente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(initialValues?.clienteId ?? '');
  // Só passa a sugerir o responsável padrão do cliente depois que o usuário
  // mexer ativamente nesse campo — no primeiro render de uma edição, respeita
  // o responsável já salvo na tarefa em vez de substituí-lo silenciosamente.
  const [clienteAlterado, setClienteAlterado] = useState(false);

  return (
    <form action={formAction} className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor="titulo" className="text-sm font-medium">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={initialValues?.titulo}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor="descricao" className="text-sm font-medium">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          defaultValue={initialValues?.descricao ?? ''}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Responsável</span>
        <SearchableSelect
          key={clienteAlterado ? `padrao-${clienteSelecionado}` : 'inicial'}
          name="responsavel_id"
          options={membros.map((m) => ({ id: m.id, label: m.nome || m.email, group: m.grupo }))}
          defaultValue={
            clienteAlterado
              ? (responsavelPadraoPorCliente[clienteSelecionado] ?? null)
              : (initialValues?.responsavelId ??
                responsavelPadraoPorCliente[clienteSelecionado] ??
                defaultResponsavelId ??
                null)
          }
          placeholder="Buscar responsável…"
          emptyLabel="Sem responsável"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Cliente (opcional)</span>
        <SearchableSelect
          name="cliente_id"
          options={clientesDisponiveis.map((c) => ({ id: c.id, label: c.nome_fantasia }))}
          defaultValue={initialValues?.clienteId ?? null}
          placeholder="Buscar cliente…"
          emptyLabel="Nenhum"
          onChange={(id) => {
            setClienteSelecionado(id);
            setClienteAlterado(true);
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="prazo" className="text-sm font-medium">
          Prazo
        </label>
        <input
          id="prazo"
          name="prazo"
          type="date"
          required={recorrente}
          defaultValue={initialValues?.prazo ?? ''}
          className="input"
        />
      </div>

      {campos.map((campo) => {
        const valorInicial = initialValues?.valores?.[campo.id] ?? '';
        const nomeInput = `campo_${campo.id}`;
        return (
          <div key={campo.id} className="flex flex-col gap-1">
            <label htmlFor={nomeInput} className="text-sm font-medium">
              {campo.nome}
            </label>
            {campo.tipo === 'texto' ? (
              <input id={nomeInput} name={nomeInput} defaultValue={valorInicial} className="input" />
            ) : campo.tipo === 'data' ? (
              <input
                id={nomeInput}
                name={nomeInput}
                type="date"
                defaultValue={valorInicial}
                className="input"
              />
            ) : campo.tipo === 'responsavel' ? (
              <SearchableSelect
                name={nomeInput}
                options={membros.map((m) => ({ id: m.id, label: m.nome || m.email, group: m.grupo }))}
                defaultValue={valorInicial || null}
                placeholder="Buscar…"
                emptyLabel="Sem responsável"
              />
            ) : campo.tipo === 'checklist' ? (
              <CampoChecklistInput nome={nomeInput} valorInicial={valorInicial} />
            ) : (
              <select id={nomeInput} name={nomeInput} defaultValue={valorInicial} className="input">
                <option value=""></option>
                {(opcoesPorCampo[campo.id] ?? []).map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}

      {!initialValues ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted/60 p-3 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="recorrente"
              checked={recorrente}
              onChange={(e) => setRecorrente(e.target.checked)}
              className="h-4 w-4"
            />
            Repetir esta tarefa
          </label>
          {recorrente ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <p className="text-xs text-muted sm:col-span-3">
                Usa o prazo acima como a data da primeira ocorrência.
              </p>
              <div className="flex flex-col gap-1">
                <label htmlFor="frequencia" className="text-xs font-medium">
                  Frequência
                </label>
                <select id="frequencia" name="frequencia" defaultValue="semanal" className="input">
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="intervalo" className="text-xs font-medium">
                  A cada
                </label>
                <input
                  id="intervalo"
                  name="intervalo"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="data_fim" className="text-xs font-medium">
                  Repetir até (opcional)
                </label>
                <input id="data_fim" name="data_fim" type="date" className="input" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {initialValues && recorrenciaAtiva ? (
        <label className="flex items-start gap-2 rounded-2xl bg-surface-muted/60 p-3 text-sm sm:col-span-2">
          <input type="checkbox" name="atualizar_recorrencia" className="mt-0.5 h-4 w-4" />
          <span>
            <span className="font-medium">Atualizar também as próximas ocorrências desta recorrência</span>
            <span className="block text-xs text-muted">
              Título, descrição, cliente e responsável valem pras tarefas que ainda serão geradas. As
              que já existem não mudam.
            </span>
          </span>
        </label>
      ) : null}

      {state.error ?<p className="text-sm text-status-inactive sm:col-span-2">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}
