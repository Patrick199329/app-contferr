import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { Badge } from '@/components/ui/badge';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { QuadroTarefaRecorrenciaLog } from '@/types/quadro-tarefa';
import { forcarGeracaoRecorrencias } from './actions';

export default async function RecorrenciasPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase
      .from('quadro_tarefas_recorrencia_log')
      .select('*')
      .order('executado_em', { ascending: false })
      .returns<QuadroTarefaRecorrenciaLog[]>(),
    supabase.from('profiles').select('id, nome, email'),
  ]);

  const nomePorId = new Map((profiles ?? []).map((p) => [p.id, p.nome || p.email]));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Painel Administrativo', href: '/admin' },
          { label: 'Recorrência de Tarefas' },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recorrência de Tarefas</h1>
        <ConfirmFormButton
          action={forcarGeracaoRecorrencias}
          confirmMessage="Forçar a geração de tarefas recorrentes agora? Isso cria a próxima ocorrência de cada recorrência ativa cuja data já chegou."
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Forçar geração agora
        </ConfirmFormButton>
      </div>

      <p className="text-sm text-muted">
        Roda automaticamente todo dia às 00:10. O log abaixo mostra as execuções (automáticas e
        manuais), incluindo falhas.
      </p>

      <ul className="app-card flex flex-col divide-y divide-border">
        {(logs ?? []).map((log) => (
          <li key={log.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {new Date(log.executado_em).toLocaleString('pt-BR')}
              </span>
              <Badge tone={log.status === 'sucesso' ? 'active' : 'inactive'}>
                {log.status === 'sucesso' ? 'Sucesso' : 'Erro'}
              </Badge>
            </div>
            <p className="text-sm text-muted">
              {log.executado_por
                ? (nomePorId.get(log.executado_por) ?? 'Usuário removido')
                : 'Automático'}
              {log.status === 'sucesso' ? ` — ${log.tarefas_criadas ?? 0} tarefa(s) criada(s)` : ''}
            </p>
            {log.mensagem ? <p className="text-sm text-status-inactive">{log.mensagem}</p> : null}
          </li>
        ))}
        {(logs ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhuma geração executada ainda.</li>
        ) : null}
      </ul>
    </div>
  );
}
