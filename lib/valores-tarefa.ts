import type { Coluna } from '@/types/departamento';

// Converte o valor bruto salvo em `tarefas.valores` para texto exibível,
// resolvendo o id do responsável para nome/e-mail e formatando datas.
export function resolveDisplayValue(
  tipo: Coluna['tipo'],
  valor: string | null | undefined,
  profiles: { id: string; email: string; nome: string }[],
): string {
  if (!valor) return '—';
  if (tipo === 'responsavel') {
    const p = profiles.find((prof) => prof.id === valor);
    return p ? p.nome || p.email : valor;
  }
  if (tipo === 'data') {
    const [ano, mes, dia] = valor.split('-');
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
  }
  return valor;
}
