import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

// Renamed from `middleware.ts` in Next.js 16 — same behavior, new file/export name.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Além das imagens, exclui arquivos estáticos soltos em public/ (ex.:
  // verificação de domínio do Google, robots.txt, sitemap.xml) — esses
  // precisam ficar acessíveis sem sessão, senão o sistema de login
  // redireciona qualquer visitante não autenticado antes de servir o arquivo.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|txt|xml|json)$).*)',
  ],
};
