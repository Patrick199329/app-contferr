import { redirect } from 'next/navigation';
import { dispararBackupManual } from './actions';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { BackupsList } from '@/components/backups-list';
import { ehAdminInnovation, getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { calcularDiasRestantesAutorizacaoGoogle, type BackupLog } from '@/types/backup';

type BackupsPageProps = {
  searchParams: Promise<{ erro?: string; autorizado?: string }>;
};

export default async function BackupsPage({ searchParams }: BackupsPageProps) {
  const profile = await getCurrentProfile();
  if (!ehAdminInnovation(profile)) {
    redirect('/dashboard');
  }

  const { erro, autorizado } = await searchParams;
  const supabase = await createClient();
  const [{ data: backups }, { data: integracaoGoogle }] = await Promise.all([
    supabase
      .from('backup_logs')
      .select('*')
      .order('iniciado_em', { ascending: false })
      .limit(60)
      .returns<BackupLog[]>(),
    supabase.from('integracao_google_drive').select('atualizado_em').eq('id', true).single(),
  ]);

  const diasRestantesGoogle = calcularDiasRestantesAutorizacaoGoogle(
    integracaoGoogle?.atualizado_em ?? null,
  );

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
      <BackupsList
        backups={backups ?? []}
        dispararBackupManual={dispararBackupManual}
        diasRestantesGoogle={diasRestantesGoogle}
        erroQuery={erro ?? null}
        autorizadoQuery={autorizado === '1'}
      />
    </div>
  );
}
