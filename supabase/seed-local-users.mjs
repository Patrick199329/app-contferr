// Seed de usuários de desenvolvimento local (Fase 1.3).
// Roda contra o Supabase local (portas remapeadas em supabase/config.toml) usando a
// service_role key padrão de dev do `supabase start` — nunca usar isto contra produção.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:40321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const DEV_PASSWORD = 'Contferr123!';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: 'admin@contferr.local', role: 'admin' },
  { email: 'usuario1@contferr.local', role: 'usuario_final' },
  { email: 'usuario2@contferr.local', role: 'usuario_final' },
];

for (const u of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: DEV_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.log(`ERRO ao criar ${u.email}:`, error.message);
    continue;
  }

  if (u.role === 'admin') {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', data.user.id);
    if (updateError) {
      console.log(`ERRO ao promover ${u.email} a admin:`, updateError.message);
      continue;
    }
  }

  console.log(`OK: ${u.email} criado com role=${u.role}`);
}
