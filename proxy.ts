import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

// Renamed from `middleware.ts` in Next.js 16 — same behavior, new file/export name.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
