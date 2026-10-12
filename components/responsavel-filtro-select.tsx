'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';

type ResponsavelFiltroSelectProps = {
  basePath: string;
  departamentoId: string;
  membros: MembroDepartamento[];
  mostrarTodos: boolean;
  responsavelFiltroId: string | null;
};

const VALOR_MEUS = 'meus';
const VALOR_TODOS = 'todos';

export function ResponsavelFiltroSelect({
  basePath,
  departamentoId,
  membros,
  mostrarTodos,
  responsavelFiltroId,
}: ResponsavelFiltroSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const valorAtual = mostrarTodos ? VALOR_TODOS : (responsavelFiltroId ?? VALOR_MEUS);

  function mudar(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('departamento', departamentoId);
    params.delete('todas');
    params.delete('responsavel');
    if (valor === VALOR_TODOS) {
      params.set('todas', '1');
    } else if (valor !== VALOR_MEUS) {
      params.set('responsavel', valor);
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <select
      value={valorAtual}
      onChange={(e) => mudar(e.target.value)}
      className="input w-auto"
      aria-label="Filtrar por responsável"
    >
      <option value={VALOR_MEUS}>Meus e sem responsável</option>
      <option value={VALOR_TODOS}>Todos os clientes do departamento</option>
      {membros.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nome || m.email}
        </option>
      ))}
    </select>
  );
}
