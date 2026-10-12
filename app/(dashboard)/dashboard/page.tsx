import { AlertTriangle, Briefcase, Building2, UserX } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import {
  getCargaPorResponsavel,
  getClientesComPendenciaDoUsuario,
  getPendenciasQuadroDoUsuario,
  getPendenciasQuadroSetor,
  getResumoDepartamentos,
  type UrgenciaQuadro,
} from '@/lib/indicadores';
import { selectEmLotes } from '@/lib/supabase/batch';
import { getDepartamentosPermitidos } from '@/lib/supabase/permissoes';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

const URGENCIA_LABEL: Record<UrgenciaQuadro, string> = {
  atrasada: 'Atrasada',
  hoje: 'Vence hoje',
  proximos_7_dias: 'Próximos 7 dias',
};
const URGENCIA_TONE: Record<UrgenciaQuadro, 'inactive' | 'pending' | 'neutral'> = {
  atrasada: 'inactive',
  hoje: 'pending',
  proximos_7_dias: 'neutral',
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const isAdmin = profile?.role === 'admin';

  const permitidos = await getDepartamentosPermitidos();
  const podeGerenciar = podeGerenciarClientes(profile);

  // Admin vê a empresa toda; os demais só os clientes vinculados a algum dos
  // departamentos que eles acessam (já inclui os subdepartamentos de um pai
  // liberado — ver getDepartamentosPermitidos). Um cliente vinculado a
  // vários desses departamentos conta uma vez só.
  let clientesAtivos = 0;
  if (permitidos === 'all') {
    const { count } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo');
    clientesAtivos = count ?? 0;
  } else if (permitidos.length > 0) {
    const vinculos = await selectEmLotes(permitidos, (lote) =>
      supabase.from('cliente_departamentos').select('cliente_id').in('departamento_id', lote),
    );
    const clienteIds = [...new Set(vinculos.map((v) => v.cliente_id))];
    const ativos = await selectEmLotes(clienteIds, (lote) =>
      supabase.from('clientes').select('id').in('id', lote).eq('status', 'ativo'),
    );
    clientesAtivos = ativos.length;
  }

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

  const [pendenciasQuadro, clientesPendentes, resumoDepartamentos, cargaPorResponsavel, pendenciasSetor] =
    await Promise.all([
      profile ? getPendenciasQuadroDoUsuario(profile.id) : Promise.resolve([]),
      profile ? getClientesComPendenciaDoUsuario(profile.id) : Promise.resolve([]),
      podeGerenciar ? getResumoDepartamentos(permitidos) : Promise.resolve([]),
      podeGerenciar ? getCargaPorResponsavel(permitidos) : Promise.resolve([]),
      podeGerenciar ? getPendenciasQuadroSetor(permitidos) : Promise.resolve([]),
    ]);

  const gruposQuadro: { urgencia: UrgenciaQuadro; itens: typeof pendenciasQuadro }[] = (
    ['atrasada', 'hoje', 'proximos_7_dias'] as const
  )
    .map((urgencia) => ({ urgencia, itens: pendenciasQuadro.filter((p) => p.urgencia === urgencia) }))
    .filter((g) => g.itens.length > 0);

  // Agregados pro painel do gerente, a partir do que getResumoDepartamentos
  // já trouxe por departamento — sem query extra.
  const clientesSemResponsavelTotal = resumoDepartamentos.reduce(
    (soma, r) => soma + r.clientesSemResponsavel,
    0,
  );
  const totalClientesComFerramenta = resumoDepartamentos.reduce((soma, r) => soma + r.totalClientes, 0);
  const totalComPendenciaTabela = resumoDepartamentos.reduce(
    (soma, r) => soma + r.clientesComPendencia,
    0,
  );
  const percentualConcluidoGeral =
    totalClientesComFerramenta > 0
      ? Math.round(
          ((totalClientesComFerramenta - totalComPendenciaTabela) / totalClientesComFerramenta) * 100,
        )
      : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tint="peach" icon={Building2} label="Clientes ativos" value={clientesAtivos} />
        <StatCard
          tint="lavender"
          icon={Briefcase}
          label={isAdmin ? 'Departamentos ativos' : 'Seus departamentos'}
          value={departamentosCount}
        />
        {podeGerenciar ? (
          <>
            <StatCard
              tint="peach"
              icon={AlertTriangle}
              label="Tarefas avulsas atrasadas no setor"
              value={pendenciasSetor.length}
            />
            <StatCard
              tint="mint"
              icon={UserX}
              label="Clientes sem responsável"
              value={clientesSemResponsavelTotal}
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Minhas pendências</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-card flex flex-col gap-3 p-6">
            <p className="text-sm font-medium text-muted uppercase">Tarefas Avulsas</p>
            {gruposQuadro.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma tarefa atrasada ou vencendo em breve.</p>
            ) : (
              gruposQuadro.map((grupo) => (
                <div key={grupo.urgencia} className="flex flex-col gap-2">
                  <Badge tone={URGENCIA_TONE[grupo.urgencia]}>
                    {URGENCIA_LABEL[grupo.urgencia]} · {grupo.itens.length}
                  </Badge>
                  <ul className="flex flex-col gap-1">
                    {grupo.itens.map((item) => (
                      <li key={item.id} className="text-sm">
                        <Link href={`/quadro-tarefas/${item.id}/editar`} className="hover:underline">
                          #{item.numero} {item.titulo}
                        </Link>
                        <span className="text-muted">
                          {' '}
                          — {item.departamentoNome}
                          {item.clienteNome ? ` · ${item.clienteNome}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="app-card flex flex-col gap-3 p-6">
            <p className="text-sm font-medium text-muted uppercase">Tabela de Tarefas</p>
            {clientesPendentes.length === 0 ? (
              <p className="text-sm text-muted">
                Nenhum dos seus clientes tem pendência na competência atual.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {clientesPendentes.map((c) => (
                  <li key={`${c.clienteId}-${c.departamentoId}`} className="text-sm">
                    <Link href={`/tarefas?departamento=${c.departamentoId}`} className="hover:underline">
                      {c.clienteNome}
                    </Link>
                    <span className="text-muted">
                      {' '}
                      — {c.departamentoNome}
                      {c.souCorresponsavel ? ' · corresponsável' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {podeGerenciar ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Visão do departamento</h2>
            {percentualConcluidoGeral !== null ? (
              <span className="text-sm text-muted">
                {percentualConcluidoGeral}% da Tabela de Tarefas concluída no mês
              </span>
            ) : null}
          </div>

          <div className="app-card flex flex-col gap-3 p-6">
            <p className="text-sm font-medium text-muted uppercase">Tarefas avulsas atrasadas do setor</p>
            {pendenciasSetor.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma tarefa avulsa atrasada no momento. 🎉</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {pendenciasSetor.map((item) => (
                  <li key={item.id} className="text-sm">
                    <Link href={`/quadro-tarefas/${item.id}/editar`} className="hover:underline">
                      #{item.numero} {item.titulo}
                    </Link>
                    <span className="text-muted">
                      {' '}
                      — {item.responsavelNome} · {item.departamentoNome}
                      {item.clienteNome ? ` · ${item.clienteNome}` : ''} · venceu em{' '}
                      {new Date(`${item.prazo}T00:00:00`).toLocaleDateString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="app-card overflow-x-auto p-6">
              <p className="mb-3 text-sm font-medium text-muted uppercase">
                Conclusão do mês por departamento
              </p>
              {resumoDepartamentos.length === 0 ? (
                <p className="text-sm text-muted">Nenhum departamento com clientes vinculados.</p>
              ) : (
                <table className="app-table w-full min-w-max border-collapse">
                  <thead>
                    <tr>
                      <th>Departamento</th>
                      <th>% concluído</th>
                      <th>Sem responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoDepartamentos.map((r) => (
                      <tr key={r.departamentoId}>
                        <td className="whitespace-nowrap">{r.departamentoNome}</td>
                        <td className="whitespace-nowrap">
                          {r.percentualConcluido === null ? '—' : `${r.percentualConcluido}%`}
                        </td>
                        <td className="whitespace-nowrap">
                          {r.clientesSemResponsavel > 0 ? (
                            <Badge tone="pending">{r.clientesSemResponsavel}</Badge>
                          ) : (
                            '0'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="app-card overflow-x-auto p-6">
              <p className="mb-3 text-sm font-medium text-muted uppercase">
                Volume de trabalho por responsável
              </p>
              {cargaPorResponsavel.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma pendência distribuída no momento.</p>
              ) : (
                <table className="app-table w-full min-w-max border-collapse">
                  <thead>
                    <tr>
                      <th>Responsável</th>
                      <th>Avulsas</th>
                      <th>Tabela</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargaPorResponsavel.slice(0, 10).map((c) => (
                      <tr key={c.profileId}>
                        <td className="whitespace-nowrap">{c.nome}</td>
                        <td className="whitespace-nowrap">{c.pendenciasQuadro}</td>
                        <td className="whitespace-nowrap">{c.pendenciasTabela}</td>
                        <td className="whitespace-nowrap font-medium">
                          {c.pendenciasQuadro + c.pendenciasTabela}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="app-card p-6">
        <h2 className="mb-4 text-sm font-medium text-muted uppercase">Acesso rápido</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/quadro-tarefas"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            Tarefas Avulsas
          </Link>
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
