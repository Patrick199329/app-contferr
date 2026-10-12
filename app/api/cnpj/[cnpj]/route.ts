import { NextResponse } from 'next/server';
import { CnpjLookupError, fetchCnpjData, isValidCnpj, type CnpjLookupResult } from '@/lib/cnpj';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: CnpjLookupResult; expiresAt: number }>();

export async function GET(_req: Request, ctx: RouteContext<'/api/cnpj/[cnpj]'>) {
  const profile = await getCurrentProfile();
  // Gerente também cria/edita cliente (ver RLS "Gerentes can create
  // clientes") — restringir a busca só a admin deixava o Gerente sem
  // autopreenchimento por engano.
  if (!podeGerenciarClientes(profile)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { cnpj } = await ctx.params;

  if (!isValidCnpj(cnpj)) {
    return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 });
  }

  const cached = cache.get(cnpj);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchCnpjData(cnpj);
    cache.set(cnpj, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof CnpjLookupError ? err.message : 'Erro inesperado.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
