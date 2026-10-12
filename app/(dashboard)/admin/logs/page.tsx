import { redirect } from 'next/navigation';
import { AuditLogList } from '@/components/audit-log-list';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ehAdminInnovation, getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { AuditLog } from '@/types/audit';

const LIMITE = 300;

export default async function LogsPage() {
  const profile = await getCurrentProfile();
  if (!ehAdminInnovation(profile)) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: eventos } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LIMITE)
    .returns<AuditLog[]>();

  const usuarioIds = [...new Set((eventos ?? []).map((e) => e.usuario_id).filter((id): id is string => !!id))];
  const { data: usuarios } = usuarioIds.length
    ? await supabase.from('profiles').select('id, nome, email').in('id', usuarioIds)
    : { data: [] };

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs
        items={[{ label: 'Painel Administrativo', href: '/admin' }, { label: 'Logs de auditoria' }]}
      />
      <div>
        <h1 className="text-xl font-semibold">Logs de auditoria</h1>
        <p className="text-sm text-muted">
          Entrada, saída, criação e edição em usuários, departamentos e permissões — os últimos{' '}
          {LIMITE} eventos. Visível só pra Innovation.
        </p>
      </div>
      <AuditLogList eventos={eventos ?? []} usuarios={usuarios ?? []} />
    </div>
  );
}
