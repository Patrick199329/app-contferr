import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

// Admin sempre tem acesso irrestrito — 'all' sinaliza isso sem precisar
// listar cada departamento. Usuário Final só vê os ids liberados para ele.
export type DepartamentosPermitidos = 'all' | string[];

export async function getDepartamentosPermitidos(): Promise<DepartamentosPermitidos> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  if (profile.role === 'admin') return 'all';

  const supabase = await createClient();
  const [{ data: permissoes }, { data: departamentos }] = await Promise.all([
    supabase.from('permissoes').select('departamento_id').eq('usuario_id', profile.id),
    supabase.from('departamentos').select('id, parent_id'),
  ]);

  // Permissão concedida no departamento pai libera também os filhos.
  const diretos = new Set((permissoes ?? []).map((p) => p.departamento_id));
  const permitidos = new Set(diretos);
  for (const dep of departamentos ?? []) {
    if (dep.parent_id && diretos.has(dep.parent_id)) {
      permitidos.add(dep.id);
    }
  }

  return [...permitidos];
}

export function podeAcessarDepartamento(
  permitidos: DepartamentosPermitidos,
  departamentoId: string,
): boolean {
  return permitidos === 'all' || permitidos.includes(departamentoId);
}

export type MembroDepartamento = { id: string; nome: string; email: string; grupo: string };

// Usuários que enxergam este departamento: admins (sempre) + quem tem
// permissão direta nele ou no seu pai. Usado pra restringir o seletor de
// "responsável" das Tarefas Avulsas a gente que realmente vai ver a tarefa.
// `grupo` identifica de onde vem o acesso (Administradores / nome do
// departamento / nome do pai), pra exibir o seletor organizado por onde a
// pessoa está.
export async function getMembrosDoDepartamento(
  departamentoId: string,
): Promise<MembroDepartamento[]> {
  const supabase = await createClient();

  const { data: departamento } = await supabase
    .from('departamentos')
    .select('id, nome, parent_id')
    .eq('id', departamentoId)
    .single();

  let pai: { id: string; nome: string } | null = null;
  if (departamento?.parent_id) {
    const { data } = await supabase
      .from('departamentos')
      .select('id, nome')
      .eq('id', departamento.parent_id)
      .single();
    pai = data;
  }

  const idsRelevantes = [departamentoId, pai?.id].filter((id): id is string => !!id);

  const [{ data: permissoes }, { data: perfisAtivos }] = await Promise.all([
    supabase.from('permissoes').select('usuario_id, departamento_id').in('departamento_id', idsRelevantes),
    supabase.from('profiles').select('id, nome, email, role').eq('status', 'ativo'),
  ]);

  const perfilPorId = new Map((perfisAtivos ?? []).map((p) => [p.id, p]));
  const membros: MembroDepartamento[] = [];

  for (const p of perfisAtivos ?? []) {
    if (p.role === 'admin') {
      membros.push({ id: p.id, nome: p.nome, email: p.email, grupo: 'Administradores' });
    }
  }

  // Uma pessoa pode ter permissão tanto no subdepartamento quanto no pai ao
  // mesmo tempo (dois registros em `permissoes`) — sem isso ela entraria
  // duas vezes na lista (chave duplicada nos seletores que usam esse id).
  // Quando isso acontece, prevalece o grupo mais específico (o do
  // subdepartamento em si, não o herdado do pai).
  const grupoPorUsuarioId = new Map<string, string>();
  for (const perm of permissoes ?? []) {
    const perfil = perfilPorId.get(perm.usuario_id);
    if (!perfil || perfil.role === 'admin') continue;
    const direto = perm.departamento_id === departamentoId;
    if (direto || !grupoPorUsuarioId.has(perm.usuario_id)) {
      grupoPorUsuarioId.set(
        perm.usuario_id,
        direto ? (departamento?.nome ?? '—') : (pai?.nome ?? '—'),
      );
    }
  }
  for (const [usuarioId, grupo] of grupoPorUsuarioId) {
    const perfil = perfilPorId.get(usuarioId);
    if (!perfil) continue;
    membros.push({ id: perfil.id, nome: perfil.nome, email: perfil.email, grupo });
  }

  return membros;
}

// Mapa cliente_id -> responsável padrão (id do perfil, ou null) daquele
// cliente dentro deste departamento — atributo do vínculo cliente x
// departamento (cliente_departamentos.responsavel_padrao_id), não um valor
// por competência. Usado na Tabela de Tarefas e nas Tarefas Avulsas.
export async function getResponsavelPadraoPorCliente(
  departamentoId: string,
): Promise<Record<string, string | null>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cliente_departamentos')
    .select('cliente_id, responsavel_padrao_id')
    .eq('departamento_id', departamentoId);

  const mapa: Record<string, string | null> = {};
  for (const vinculo of data ?? []) {
    mapa[vinculo.cliente_id] = vinculo.responsavel_padrao_id;
  }
  return mapa;
}
