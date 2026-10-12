// O PostgREST (por baixo do Supabase) codifica `.in('coluna', [...])` na
// própria URL da requisição — com uma lista de ~250+ UUIDs (comum agora que
// departamentos como "Simples" passaram de 200+ clientes reais na carga do
// Alterdata) a URL estoura o limite do servidor e a query falha com "URI
// too long", sem lançar exceção visível — o Supabase JS só devolve
// `{ data: null, error }`, e se o chamador só desestrutura `data` (o padrão
// usado em quase todo o projeto), o erro passa batido e a tela mostra dado
// vazio como se realmente não houvesse nada. `selectEmLotes` quebra a lista
// em pedaços seguros e junta os resultados, sem mudar o formato de retorno.
const TAMANHO_LOTE = 150;

export async function selectEmLotes<T>(
  ids: string[],
  fazerQuery: (lote: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  if (ids.length === 0) return [];

  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
    lotes.push(ids.slice(i, i + TAMANHO_LOTE));
  }

  const resultados = await Promise.all(lotes.map(fazerQuery));
  return resultados.flatMap((r) => r.data ?? []);
}
