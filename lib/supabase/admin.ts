import { createClient } from '@supabase/supabase-js';

// Client com a service_role key — só pode ser usado em código server-side
// (Server Actions/Route Handlers), nunca importado por um Client Component.
// Necessário para operações do Auth Admin API (criar usuário) que não têm
// equivalente via o client autenticado normal.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
