import { redirect } from 'next/navigation';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { formatCompetencia } from '@/lib/competencia';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { ViradaLog } from '@/types/virada';
import { forcarVirada } from './actions';

export default async function ViradaPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase
      .from('virada_log')
      .select('*')
      .order('executado_em', { ascending: false })
      .returns<ViradaLog[]>(),
    supabase.from('profiles').select('id, nome, email'),
  ]);

  const nomePorId = new Map((profiles ?? []).map((p) => [p.id, p.nome || p.email]));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Virada Mensal</h1>
        <ConfirmFormButton
          action={forcarVirada}
          confirmMessage="Forçar a virada mensal agora? Isso cria as tarefas do mês corrente para todos os clientes e departamentos ativos que ainda não tiverem."
          className="rounded bg-foreground px-4 py-2 text-sm text-background"
        >
          Forçar virada agora
        </ConfirmFormButton>
      </div>

      <p className="text-sm text-black/60 dark:text-white/60">
        Roda automaticamente todo dia 1 às 00:05. O log abaixo mostra as execuções (automáticas e
        manuais), incluindo falhas.
      </p>

      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {(logs ?? []).map((log) => (
          <li key={log.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{formatCompetencia(log.competencia)}</span>
              <span
                className={
                  log.status === 'sucesso'
                    ? 'text-sm text-emerald-700 dark:text-emerald-400'
                    : 'text-sm text-red-600 dark:text-red-400'
                }
              >
                {log.status === 'sucesso' ? 'Sucesso' : 'Erro'}
              </span>
            </div>
            <p className="text-sm text-black/60 dark:text-white/60">
              {new Date(log.executado_em).toLocaleString('pt-BR')} —{' '}
              {log.executado_por
                ? (nomePorId.get(log.executado_por) ?? 'Usuário removido')
                : 'Automático'}
              {log.status === 'sucesso' ? ` — ${log.linhas_criadas} tarefa(s) criada(s)` : ''}
            </p>
            {log.mensagem ? (
              <p className="text-sm text-red-600 dark:text-red-400">{log.mensagem}</p>
            ) : null}
          </li>
        ))}
        {(logs ?? []).length === 0 ? (
          <li className="py-3 text-sm text-black/60 dark:text-white/60">
            Nenhuma virada executada ainda.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
