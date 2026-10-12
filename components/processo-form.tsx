'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActionState, useState } from 'react';
import type { ProcessoFormState } from '@/app/(dashboard)/processos/actions';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import { PROCESSO_PRIORIDADE_LABELS, type ProcessoPrioridade, type TipoProcesso } from '@/types/processo';

type ProcessoFormProps = {
  action: (prevState: ProcessoFormState, formData: FormData) => Promise<ProcessoFormState>;
  tiposProcesso: TipoProcesso[];
  clientesDisponiveis: { id: string; nome_fantasia: string }[];
  membros: MembroDepartamento[];
  defaultResponsavelId?: string;
  // Preenchido quando a tela volta do cadastro completo de cliente (ver
  // "Cadastrar cliente completo" abaixo) — já vem com o cliente recém-criado
  // pra pré-selecionar, sem precisar buscar de novo.
  clienteRecemCriadoId?: string | null;
};

const initialState: ProcessoFormState = { error: null };

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function ProcessoForm({
  action,
  tiposProcesso,
  clientesDisponiveis,
  membros,
  defaultResponsavelId,
  clienteRecemCriadoId,
}: ProcessoFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tipoId, setTipoId] = useState(tiposProcesso[0]?.id ?? '');
  const [titulo, setTitulo] = useState(tiposProcesso[0]?.nome ?? '');
  const [tituloTocado, setTituloTocado] = useState(false);
  const [clienteModo, setClienteModo] = useState<'cadastrado' | 'novo'>('cadastrado');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Link "Cadastrar cliente completo" leva pro cadastro de verdade (CNPJ,
  // departamentos etc.) já sabendo voltar exatamente pra esta tela — remove
  // um "cliente" antigo da querystring pra não arrastar uma pré-seleção
  // velha se o usuário cadastrar mais de um cliente nessa mesma sessão.
  const paramsSemCliente = new URLSearchParams(searchParams.toString());
  paramsSemCliente.delete('cliente');
  const voltarUrl = `${pathname}${paramsSemCliente.toString() ? `?${paramsSemCliente.toString()}` : ''}`;

  function escolherTipo(tipo: TipoProcesso) {
    setTipoId(tipo.id);
    if (!tituloTocado) setTitulo(tipo.nome);
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <input type="hidden" name="tipo_processo_id" value={tipoId} />

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">1. Serviço</span>

        {tiposProcesso.length === 0 ? (
          <p className="text-sm text-status-inactive">
            Nenhum tipo de serviço configurado ainda pra este departamento — peça pro admin cadastrar
            em Departamentos.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiposProcesso.map((tipo) => (
              <button
                key={tipo.id}
                type="button"
                onClick={() => escolherTipo(tipo)}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors ${
                  tipo.id === tipoId ? 'border-primary bg-accent/10' : 'border-border hover:bg-surface-muted'
                }`}
              >
                <span
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: tipo.cor }}
                >
                  {tipo.codigo}
                </span>
                <span className="text-sm font-medium">{tipo.nome}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="processo-titulo" className="text-sm font-medium">
              Título do serviço
            </label>
            <input
              id="processo-titulo"
              name="titulo"
              required
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setTituloTocado(true);
              }}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="processo-prioridade" className="text-sm font-medium">
              Prioridade
            </label>
            <select id="processo-prioridade" name="prioridade" defaultValue="normal" className="input">
              {Object.entries(PROCESSO_PRIORIDADE_LABELS).map(([value, label]) => (
                <option key={value} value={value as ProcessoPrioridade}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Responsável</span>
            <SearchableSelect
              name="responsavel_id"
              options={membros.map((m) => ({ id: m.id, label: m.nome || m.email, group: m.grupo }))}
              defaultValue={defaultResponsavelId ?? null}
              placeholder="Buscar responsável…"
              emptyLabel="Sem responsável"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="processo-prazo" className="text-sm font-medium">
              Prazo final
            </label>
            <input id="processo-prazo" name="prazo_final" type="date" className="input" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">2. Cliente</span>
        <div className="flex w-fit rounded-full bg-surface-muted p-1 text-sm">
          <button
            type="button"
            onClick={() => setClienteModo('cadastrado')}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              clienteModo === 'cadastrado' ? 'bg-surface shadow-sm' : 'text-muted'
            }`}
          >
            Cliente cadastrado
          </button>
          <button
            type="button"
            onClick={() => setClienteModo('novo')}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              clienteModo === 'novo' ? 'bg-surface shadow-sm' : 'text-muted'
            }`}
          >
            Novo cliente
          </button>
        </div>

        {clienteModo === 'cadastrado' ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Selecione o cliente</label>
            <SearchableSelect
              key={clienteRecemCriadoId ?? 'inicial'}
              name="cliente_id"
              options={clientesDisponiveis.map((c) => ({ id: c.id, label: c.nome_fantasia }))}
              defaultValue={clienteRecemCriadoId ?? null}
              placeholder="Buscar cliente…"
              emptyLabel="Nenhum"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted/60 p-4">
            <div>
              <p className="text-sm font-medium">Empresa ainda não é cliente da Contferr</p>
              <p className="text-xs text-muted">
                Para padronizar o cadastro (CNPJ, departamentos, responsável), use o cadastro
                completo, ele volta pra cá com o cliente já selecionado.
              </p>
            </div>
            <Link
              href={`/clientes/novo?voltar=${encodeURIComponent(voltarUrl)}`}
              className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Cadastrar cliente completo
            </Link>
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <label htmlFor="processo-cliente-avulso" className="text-xs font-medium text-muted">
                Ou, se a empresa ainda nem tem CNPJ, só informe o nome
              </label>
              <input
                id="processo-cliente-avulso"
                name="cliente_nome_avulso"
                placeholder="Nome da empresa"
                className="input"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted uppercase">3. Controle inicial</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="processo-data-abertura" className="text-sm font-medium">
              Data de abertura
            </label>
            <input
              id="processo-data-abertura"
              name="data_abertura"
              type="date"
              defaultValue={hoje()}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="processo-protocolo" className="text-sm font-medium">
              Protocolo geral
            </label>
            <input
              id="processo-protocolo"
              name="protocolo_geral"
              placeholder="Opcional"
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="processo-observacoes" className="text-sm font-medium">
              Observações
            </label>
            <textarea
              id="processo-observacoes"
              name="observacoes"
              rows={3}
              placeholder="Documentos pendentes, instruções do cliente ou particularidades do caso"
              className="input"
            />
          </div>
        </div>
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending || !tipoId} className="w-fit">
        {pending ? 'Criando…' : 'Criar processo e etapas'}
      </Button>
    </form>
  );
}
