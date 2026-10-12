import { createClient } from '@/lib/supabase/server';

// Sugestões pros campos de texto livre (tipo/órgão) a partir do que já foi
// cadastrado no departamento — evita "Alvará" / "alvara" / "Alvará " variando.
export async function getSugestoesLicenca(departamentoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('licencas')
    .select('tipo, orgao_emissor')
    .eq('departamento_id', departamentoId);

  const tipos = new Set<string>();
  const orgaos = new Set<string>();
  for (const l of data ?? []) {
    tipos.add(l.tipo);
    if (l.orgao_emissor) orgaos.add(l.orgao_emissor);
  }
  const ordenar = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
  return { tiposSugeridos: ordenar(tipos), orgaosSugeridos: ordenar(orgaos) };
}

export async function getClientesAtivos(incluirId?: string | null) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('clientes')
    .select('id, nome_fantasia, status, cidade, uf')
    .order('nome_fantasia');
  return (data ?? [])
    .filter((c) => c.status === 'ativo' || c.id === incluirId)
    .map((c) => ({
      id: c.id,
      nome_fantasia: c.nome_fantasia,
      cidade: c.cidade,
      uf: c.uf,
    }));
}
