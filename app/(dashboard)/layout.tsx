import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { getCurrentProfile } from '@/lib/supabase/profile';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <DashboardShell
      nome={profile.nome}
      email={profile.email}
      role={profile.role}
      isAdmin={profile.role === 'admin'}
    >
      {children}
    </DashboardShell>
  );
}
