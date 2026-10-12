import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { Badge } from '@/components/ui/badge';
import { formatCompetencia } from '@/lib/competencia';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { ParcelamentoViradaLog, ViradaLog } from '@/types/virada';
import { forcarVirada, forcarViradaParcelamentos } from './actions';

export default async function ViradaPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const [{ data: logs }, { data: logsParcelamentos }, { data: profiles }] = await Promise.all([
    supabase
      .from('virada_log')
      .select('*')
      .order('executado_em', { ascending: false })
      .returns<ViradaLog[]>(),
    supabase
      .from('parcelamento_virada_log')
      .select('*')
      .order('executado_em', { ascending: false })
      .returns<ParcelamentoViradaLog[]>(),
    supabase.from('profiles').select('id, nome, email'),
  ]);

  const nomePorId = new Map((profiles ?? []).map((p) => [p.id, p.nome || p.email]));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Painel Administrativo', href: '/admin' },
          { label: 'Virada Mensal' },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Virada Mensal</h1>
        <ConfirmFormButton
          action={forcarVirada}
          confirmMessage="Forçar a virada mensal agora? Isso cria as tarefas do mês corrente para todos os clientes e departamentos ativos que ainda não tiverem."
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Forçar virada agora
        </ConfirmFormButton>
      </div>

      <p className="text-sm text-muted">
        Roda automaticamente todo dia 1 às 00:05. O log abaixo mostra as execuções (automáticas e
        manuais), incluindo falhas.
      </p>

      <ul className="app-card flex flex-col divide-y divide-border">
        {(logs ?? []).map((log) => (
          <li key={log.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{formatCompetencia(log.competencia)}</span>
              <Badge tone={log.status === 'sucesso' ? 'active' : 'inactive'}>
                {log.status === 'sucesso' ? 'Sucesso' : 'Erro'}
              </Badge>
            </div>
            <p className="text-sm text-muted">
              {new Date(log.executado_em).toLocaleString('pt-BR')} —{' '}
              {log.executado_por
                ? (nomePorId.get(log.executado_por) ?? 'Usuário removido')
                : 'Automático'}
              {log.status === 'sucesso' ? ` — ${log.linhas_criadas} tarefa(s) criada(s)` : ''}
            </p>
            {log.mensagem ? <p className="text-sm text-status-inactive">{log.mensagem}</p> : null}
          </li>
        ))}
        {(logs ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhuma virada executada ainda.</li>
        ) : null}
      </ul>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Virada de Parcelamentos</h2>
        <ConfirmFormButton
          action={forcarViradaParcelamentos}
          confirmMessage="Forçar a virada de parcelamentos agora? Isso gera a guia do mês corrente para cada parcelamento ativo que ainda não tiver, e aplica as regras de tolerância/quitação."
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Forçar virada agora
        </ConfirmFormButton>
      </div>

      <p className="text-sm text-muted">
        Roda automaticamente todo dia 1 às 00:15. Marca como &ldquo;Perdido&rdquo; parcelamentos que
        passaram do limite de meses sem pagamento e como &ldquo;Quitado&rdquo; os que já têm todas as
        parcelas geradas e pagas.
      </p>

      <ul className="app-card flex flex-col divide-y divide-border">
        {(logsParcelamentos ?? []).map((log) => (
          <li key={log.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{formatCompetencia(log.competencia)}</span>
              <Badge tone={log.status === 'sucesso' ? 'active' : 'inactive'}>
                {log.status === 'sucesso' ? 'Sucesso' : 'Erro'}
              </Badge>
            </div>
            <p className="text-sm text-muted">
              {new Date(log.executado_em).toLocaleString('pt-BR')} —{' '}
              {log.executado_por
                ? (nomePorId.get(log.executado_por) ?? 'Usuário removido')
                : 'Automático'}
              {log.status === 'sucesso'
                ? ` — ${log.parcelas_criadas} guia(s) criada(s), ${log.parcelamentos_perdidos} perdido(s), ${log.parcelamentos_quitados} quitado(s)`
                : ''}
            </p>
            {log.mensagem ? <p className="text-sm text-status-inactive">{log.mensagem}</p> : null}
          </li>
        ))}
        {(logsParcelamentos ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhuma virada executada ainda.</li>
        ) : null}
      </ul>
    </div>
  );
}
