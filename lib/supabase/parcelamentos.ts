import { createClient } from '@/lib/supabase/server';

// Sugestões pro campo "Origem/Portal" a partir do que já foi cadastrado no
// departamento — RFB/PGFN/Estado/Município num, o nome do portal no outro,
// cada departamento com sua própria nomenclatura (mesma ideia de
// lib/supabase/licencas.ts para tipo/órgão).
export async function getSugestoesOrigem(departamentoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('parcelamentos')
    .select('origem')
    .eq('departamento_id', departamentoId);

  const origens = new Set<string>();
  for (const p of data ?? []) origens.add(p.origem);
  return [...origens].sort((a, b) => a.localeCompare(b));
}
