import { Briefcase, Building2, ClipboardCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/stat-card';
import { currentCompetencia, formatCompetencia } from '@/lib/competencia';
import { getDepartamentosPermitidos } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const isAdmin = profile?.role === 'admin';
  const competencia = currentCompetencia();

  const permitidos = await getDepartamentosPermitidos();

  const { count: clientesAtivos } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ativo');

  let departamentosCount = 0;
  if (permitidos === 'all') {
    const { count } = await supabase
      .from('departamentos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo');
    departamentosCount = count ?? 0;
  } else {
    departamentosCount = permitidos.length;
  }

  let tarefasQuery = supabase
    .from('tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('competencia', competencia);
  if (permitidos !== 'all') {
    tarefasQuery = tarefasQuery.in('departamento_id', permitidos.length > 0 ? permitidos : ['—']);
  }
  const { count: tarefasCompetencia } = await tarefasQuery;

  const { count: usuariosAtivos } = isAdmin
    ? await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')
    : { count: null };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tint="peach"
          icon={Building2}
          label="Clientes ativos"
          value={clientesAtivos ?? 0}
        />
        <StatCard
          tint="lavender"
          icon={Briefcase}
          label={isAdmin ? 'Departamentos ativos' : 'Seus departamentos'}
          value={departamentosCount}
        />
        <StatCard
          tint="mint"
          icon={ClipboardCheck}
          label="Tarefas na competência atual"
          value={tarefasCompetencia ?? 0}
          hint={formatCompetencia(competencia)}
        />
        {isAdmin ? (
          <StatCard tint="peach" icon={Users} label="Usuários ativos" value={usuariosAtivos ?? 0} />
        ) : null}
      </div>

      <div className="app-card p-6">
        <h2 className="mb-4 text-sm font-medium text-muted uppercase">Acesso rápido</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tarefas"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            Tabela de Tarefas
          </Link>
          <Link
            href="/clientes"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            Clientes
          </Link>
          <Link
            href="/historico"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            Histórico
          </Link>
          {isAdmin ? (
            <Link
              href="/admin/virada"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
            >
              Virada Mensal
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
