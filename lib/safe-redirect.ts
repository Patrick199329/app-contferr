// Valida um destino de "voltar" (?voltar=... na querystring) antes de usar
// em redirect() — só aceita caminho relativo interno, nunca uma URL externa
// (evita open redirect via link malicioso apontando pro nosso próprio site).
export function caminhoInternoSeguro(valor: string | undefined | null): string | null {
  if (!valor) return null;
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return null;
  return valor;
}
