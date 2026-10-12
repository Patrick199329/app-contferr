'use client';

import { useActionState, useState } from 'react';
import {
  COLUNA_PERIODICIDADE_LABELS,
  COLUNA_TIPOS_COM_OPCOES,
  COLUNA_TIPO_LABELS,
  TIPOS_COM_MANTER_VALOR_ANTERIOR,
  type ColunaPeriodicidade,
  type ColunaTipo,
} from '@/types/departamento';
import { CAMPO_CLIENTE_LABELS, CAMPOS_CLIENTE_RESTRITOS, type CampoCliente } from '@/types/cliente';
import type { FormState } from '@/app/(dashboard)/departamentos/actions';
import { Button } from '@/components/ui/button';
import { NOMES_MESES } from '@/lib/competencia';
import { LINK_ICONE_PADRAO, LINK_ICONES, type LinkIconeKey } from '@/lib/link-icones';

type ColunaFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  // Libera as credenciais (senha gov.br, código de acesso, senha) como
  // opção de "Campo do cliente" — reforçado também por trigger no banco, não
  // só aqui (ver migration verificar_campo_cliente_alvo_restrito).
  usaFuncionarios: boolean;
  // Libera a opção "É corresponsável" pra colunas de Responsável — só
  // departamentos que ligaram essa opção em Ferramentas habilitadas.
  usaCorresponsavel: boolean;
  initialValues?: {
    nome: string;
    tipo: ColunaTipo;
    periodicidade: ColunaPeriodicidade;
    mesesAplicaveis: number[];
    campoClienteAlvo?: CampoCliente | null;
    linkIcone?: LinkIconeKey;
    linkUrl?: string | null;
    manterValorAnterior?: boolean;
    ehCorresponsavel?: boolean;
  };
  submitLabel?: string;
};

const initialState: FormState = { error: null };

// "campo_funcionario" é um tipo legado (módulo revertido) — nunca oferecido
// pra criar coluna nova, mesmo que uma coluna antiga ainda tenha esse tipo.
const tiposDisponiveis = Object.entries(COLUNA_TIPO_LABELS).filter(
  ([value]) => value !== 'campo_funcionario',
);

export function ColunaForm({
  action,
  usaFuncionarios,
  usaCorresponsavel,
  initialValues,
  submitLabel,
}: ColunaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tipo, setTipo] = useState<ColunaTipo>(initialValues?.tipo ?? 'texto');
  const [ehCorresponsavel, setEhCorresponsavel] = useState(initialValues?.ehCorresponsavel ?? false);
  const [periodicidade, setPeriodicidade] = useState<ColunaPeriodicidade>(
    initialValues?.periodicidade ?? 'mensal',
  );
  const [campoClienteAlvo, setCampoClienteAlvo] = useState<CampoCliente>(
    initialValues?.campoClienteAlvo ?? 'codigo',
  );
  const [linkIcone, setLinkIcone] = useState<LinkIconeKey>(initialValues?.linkIcone ?? LINK_ICONE_PADRAO);
  const precisaOpcoes = COLUNA_TIPOS_COM_OPCOES.includes(tipo);
  const permiteManterValorAnterior = TIPOS_COM_MANTER_VALOR_ANTERIOR.includes(tipo);
  const camposClienteDisponiveis = usaFuncionarios
    ? Object.entries(CAMPO_CLIENTE_LABELS)
    : Object.entries(CAMPO_CLIENTE_LABELS).filter(
        ([value]) => !CAMPOS_CLIENTE_RESTRITOS.includes(value as CampoCliente),
      );

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="coluna-nome" className="text-sm font-medium">
          Nome da coluna
        </label>
        <input
          id="coluna-nome"
          name="nome"
          required
          defaultValue={initialValues?.nome}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="coluna-tipo" className="text-sm font-medium">
          Tipo
        </label>
        <select
          id="coluna-tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as ColunaTipo)}
          className="input"
        >
          {tiposDisponiveis.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {tipo === 'campo_cliente' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-cliente-alvo" className="text-sm font-medium">
            Campo do cliente
          </label>
          <select
            id="campo-cliente-alvo"
            name="campo_cliente_alvo"
            value={campoClienteAlvo}
            onChange={(e) => setCampoClienteAlvo(e.target.value as CampoCliente)}
            className="input"
          >
            {camposClienteDisponiveis.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {tipo === 'link' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="coluna-link-url" className="text-sm font-medium">
            URL
          </label>
          <input
            id="coluna-link-url"
            name="link_url"
            type="text"
            required
            placeholder="https://…"
            defaultValue={initialValues?.linkUrl ?? ''}
            className="input"
          />
          <span className="text-xs text-muted">
            Fixa pra essa coluna — a mesma pra todo cliente e mês. Nas telas de uso aparece só o
            ícone, clicável.
          </span>
        </div>
      ) : null}

      {tipo === 'link' ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Ícone do link</span>
          <input type="hidden" name="link_icone" value={linkIcone} />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {(Object.entries(LINK_ICONES) as [LinkIconeKey, (typeof LINK_ICONES)[LinkIconeKey]][]).map(
              ([value, { label, Icon }]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLinkIcone(value)}
                  title={label}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition-colors ${
                    linkIcone === value
                      ? 'border-primary bg-accent/10'
                      : 'border-border hover:bg-surface-muted'
                  }`}
                >
                  <Icon size={18} />
                </button>
              ),
            )}
          </div>
          <span className="text-xs text-muted">{LINK_ICONES[linkIcone].label}</span>
        </div>
      ) : null}

      {tipo === 'responsavel' && usaCorresponsavel ? (
        <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
          <input
            type="checkbox"
            name="eh_corresponsavel"
            checked={ehCorresponsavel}
            onChange={(e) => setEhCorresponsavel(e.target.checked)}
            className="h-4 w-4"
          />
          <span>
            <span className="font-medium">Esta coluna é de corresponsável</span>
            <span className="block text-xs text-muted">
              Marca quem é o corresponsável daquele cliente, que passa a ver o cliente no filtro
              &quot;Sou corresponsável&quot;. O valor é mantido nos meses seguintes.
            </span>
          </span>
        </label>
      ) : null}

      {permiteManterValorAnterior && !ehCorresponsavel ? (
        <label className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-sm">
          <input
            type="checkbox"
            name="manter_valor_anterior"
            defaultChecked={initialValues?.manterValorAnterior}
            className="h-4 w-4"
          />
          <span>
            <span className="font-medium">Manter o valor do mês anterior</span>
            <span className="block text-xs text-muted">
              Na virada do mês, começa com o mesmo valor do mês passado em vez de vazio — útil pra
              informações que não mudam todo mês. Continua editável a qualquer momento.
            </span>
          </span>
        </label>
      ) : null}

      {precisaOpcoes && !initialValues ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="opcoes" className="text-sm font-medium">
            Opções (uma por linha)
          </label>
          <textarea
            id="opcoes"
            name="opcoes"
            rows={4}
            placeholder={'Pendente\nEm andamento\nConcluído'}
            className="input"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="coluna-periodicidade" className="text-sm font-medium">
          Periodicidade
        </label>
        <select
          id="coluna-periodicidade"
          name="periodicidade"
          value={periodicidade}
          onChange={(e) => setPeriodicidade(e.target.value as ColunaPeriodicidade)}
          className="input"
        >
          {Object.entries(COLUNA_PERIODICIDADE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {periodicidade !== 'mensal' ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Em quais meses ela aparece</span>
          <div className="grid grid-cols-3 gap-2">
            {NOMES_MESES.map((nomeMes, i) => (
              <label key={nomeMes} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="meses_aplicaveis"
                  value={i + 1}
                  defaultChecked={initialValues?.mesesAplicaveis.includes(i + 1)}
                  className="h-4 w-4"
                />
                {nomeMes.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
        {pending ? 'Salvando…' : (submitLabel ?? 'Adicionar coluna')}
      </Button>
    </form>
  );
}
