'use client';

import { useState, useTransition } from 'react';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';

type ResponsavelPadraoCellProps = {
  membros: MembroDepartamento[];
  initialValue: string | null;
  // Nome/e-mail de quem já está atribuído, pra quando essa pessoa não está
  // (mais) na lista de membros do departamento — por exemplo, perdeu acesso
  // depois de ter sido definida como responsável. Sem isso, o <select> cairia
  // silenciosamente pra "Sem responsável padrão" (nenhuma <option> bateria
  // com o value), passando a impressão de que o campo está vazio quando na
  // verdade tem alguém atribuído — e um salvamento sem querer apagaria isso.
  initialValueLabel?: string;
  action: (novoValor: string | null) => Promise<void>;
};

// Autosave ao trocar, mesmo padrão de components/tarefa-cell.tsx. Reaproveitado
// na Tabela de Tarefas (valor por competência, tarefas.responsavel_padrao_id)
// e no cadastro do cliente (valor "atual", cliente_departamentos.
// responsavel_padrao_id) — cada tela liga a action certa.
export function ResponsavelPadraoCell({
  membros,
  initialValue,
  initialValueLabel,
  action,
}: ResponsavelPadraoCellProps) {
  // useState só usa initialValue no primeiro render — quem chama este
  // componente precisa passar `key` incluindo o valor atual (veja os dois
  // usos em tarefas-table.tsx e clientes/[id]/editar/page.tsx), senão um
  // valor novo vindo do servidor (router.refresh() disparado pelo Realtime,
  // por exemplo) nunca apareceria sozinho na tela — remonta em vez de
  // sincronizar via efeito.
  const [value, setValue] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(novoValor: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action(novoValor || null);
      } catch {
        setError('Erro ao salvar');
      }
    });
  }

  const membrosExibidos =
    initialValue && !membros.some((m) => m.id === initialValue)
      ? [
          ...membros,
          { id: initialValue, nome: initialValueLabel ?? initialValue, email: '', grupo: 'Outros' },
        ]
      : membros;

  const grupos = new Map<string, MembroDepartamento[]>();
  for (const m of membrosExibidos) {
    grupos.set(m.grupo, [...(grupos.get(m.grupo) ?? []), m]);
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          salvar(e.target.value);
        }}
        className="input w-auto"
      >
        <option value="">Sem responsável padrão</option>
        {[...grupos.entries()].map(([grupo, pessoas]) => (
          <optgroup key={grupo} label={grupo}>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome || p.email}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {isPending ? <span className="text-xs text-muted">…</span> : null}
      {error ? <span className="text-xs text-status-inactive">{error}</span> : null}
    </div>
  );
}
