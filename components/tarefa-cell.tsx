'use client';

import { useState, useTransition } from 'react';
import { updateTarefaValor } from '@/app/(dashboard)/tarefas/actions';
import { ChecklistEstadoPicker } from '@/components/checklist-estado-picker';
import { copyToClipboard } from '@/lib/clipboard';
import { CAMPOS_CLIENTE_RESTRITOS, type CampoCliente } from '@/types/cliente';
import type { ColunaTipo } from '@/types/departamento';
import { LINK_ICONES, normalizarUrl, type LinkIconeKey } from '@/lib/link-icones';

type TarefaCellProps = {
  clienteId: string;
  departamentoId: string;
  competencia: string;
  colunaId: string;
  tipo: ColunaTipo;
  opcoes?: string[];
  profiles?: { id: string; email: string; nome: string; status: 'ativo' | 'inativo' }[];
  initialValue: string;
  onSaved?: () => void;
  // Só usados quando tipo === 'campo_cliente' — valor lido ao vivo do
  // cadastro do cliente (nunca de `tarefas.valores`), ver
  // components/tarefas-table.tsx.
  campoClienteAlvo?: CampoCliente | null;
  campoClienteValor?: string | null;
  // Só usados quando tipo === 'link' — URL e ícone são fixos na configuração
  // da coluna, não por linha; a célula só abre o link, sem campo pra editar.
  linkIcone?: LinkIconeKey;
  linkUrl?: string | null;
};

export function TarefaCell({
  clienteId,
  departamentoId,
  competencia,
  colunaId,
  tipo,
  opcoes = [],
  profiles = [],
  initialValue,
  onSaved,
  campoClienteAlvo,
  campoClienteValor,
  linkIcone,
  linkUrl,
}: TarefaCellProps) {
  const [value, setValue] = useState(initialValue);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const [campoVisivel, setCampoVisivel] = useState(false);

  function copiar(texto: string) {
    copyToClipboard(texto).then((ok) => {
      if (!ok) return;
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  function save(newValue: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateTarefaValor(clienteId, departamentoId, competencia, colunaId, newValue);
        setDirty(false);
        onSaved?.();
      } catch {
        setError('Erro ao salvar');
      }
    });
  }

  const inputClass =
    'w-full rounded-xl border border-transparent bg-transparent px-2 py-1.5 outline-none transition-colors hover:border-border focus:border-primary';

  let field: React.ReactNode;

  if (tipo === 'texto') {
    field = (
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        onBlur={() => dirty && save(value)}
        rows={2}
        className={`${inputClass} resize-y whitespace-pre-wrap`}
      />
    );
  } else if (tipo === 'data') {
    field = (
      <input
        type="date"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        className={inputClass}
      />
    );
  } else if (tipo === 'lista_opcoes' || tipo === 'status') {
    // Se o valor já salvo referir uma opção desativada depois, mantém ele visível
    // (marcado) mesmo fora da lista de opções selecionáveis para novos preenchimentos.
    const opcoesExibidas = value && !opcoes.includes(value) ? [...opcoes, value] : opcoes;
    field = (
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        className={inputClass}
      >
        <option value=""></option>
        {opcoesExibidas.map((op) => (
          <option key={op} value={op}>
            {op === value && !opcoes.includes(op) ? `${op} (inativa)` : op}
          </option>
        ))}
      </select>
    );
  } else if (tipo === 'responsavel') {
    // Usuário inativo não pode ser escolhido daqui pra frente, mas se já era
    // o valor salvo continua aparecendo (marcado) — mesmo tratamento dado às
    // opções desativadas de lista_opcoes/status logo abaixo.
    const opcoesExibidas = profiles.filter((p) => p.status === 'ativo' || p.id === value);
    field = (
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
        className={inputClass}
      >
        <option value=""></option>
        {opcoesExibidas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome || p.email}
            {p.status === 'inativo' ? ' (inativo)' : ''}
          </option>
        ))}
      </select>
    );
  } else if (tipo === 'checklist') {
    field = (
      <ChecklistEstadoPicker
        value={value}
        onSelect={(novoValor) => {
          setValue(novoValor);
          save(novoValor);
        }}
      />
    );
  } else if (tipo === 'campo_cliente') {
    const valor = campoClienteValor ?? '';
    const sensivel = campoClienteAlvo ? CAMPOS_CLIENTE_RESTRITOS.includes(campoClienteAlvo) : false;
    field = valor ? (
      <div className="flex items-center gap-2">
        <span className="text-sm">{sensivel && !campoVisivel ? '••••••' : valor}</span>
        <div className="flex flex-col items-start">
          {sensivel ? (
            <button
              type="button"
              onClick={() => setCampoVisivel((v) => !v)}
              className="text-xs text-muted hover:underline"
            >
              {campoVisivel ? 'Esconder' : 'Mostrar'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copiar(valor)}
            className="text-xs text-muted hover:underline"
          >
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
    ) : (
      <span className="text-sm text-muted">—</span>
    );
  } else if (tipo === 'link') {
    const Icon = LINK_ICONES[linkIcone ?? 'link'].Icon;
    field = linkUrl ? (
      <a
        href={normalizarUrl(linkUrl)}
        target="_blank"
        rel="noreferrer"
        title={linkUrl}
        className="inline-flex text-muted hover:text-primary"
      >
        <Icon size={18} />
      </a>
    ) : (
      <span className="text-sm text-muted">—</span>
    );
  } else {
    field = null;
  }

  return (
    <div className={`flex gap-1 ${tipo === 'texto' ? 'items-start' : 'items-center'}`}>
      {field}
      {isPending ? <span className="text-xs text-muted">…</span> : null}
      {error ? <span className="text-xs text-status-inactive">{error}</span> : null}
    </div>
  );
}
