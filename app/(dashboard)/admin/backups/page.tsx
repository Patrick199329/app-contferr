import { redirect } from 'next/navigation';
import { dispararBackupManual } from './actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { BackupsList } from '@/components/backups-list';
import { ehAdminInnovation, getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { BackupLog } from '@/types/backup';

export default async function BackupsPage() {
  const profile = await getCurrentProfile();
  if (!ehAdminInnovation(profile)) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: backups } = await supabase
    .from('backup_logs')
    .select('*')
    .order('iniciado_em', { ascending: false })
    .limit(60)
    .returns<BackupLog[]>();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Painel Administrativo', href: '/admin' }, { label: 'Backups' }]} />
      <div>
        <h1 className="text-xl font-semibold">Backups</h1>
        <p className="text-sm text-muted">
          Dump diário do banco (dados, usuários e arquivos) rodado fora da plataforma, no GitHub
          Actions, e salvo no Google Drive. Visível só pra Innovation.
        </p>
      </div>
      <BackupsList backups={backups ?? []} dispararBackupManual={dispararBackupManual} />
    </div>
  );
}
