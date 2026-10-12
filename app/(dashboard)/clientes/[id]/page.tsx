import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ClienteDriveLink } from '@/components/cliente-drive-link';
import { Badge } from '@/components/ui/badge';
import { formatDocumento } from '@/lib/cnpj';
import { formatCompetencia } from '@/lib/competencia';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { resolveDisplayValue } from '@/lib/valores-tarefa';
import type { Cliente } from '@/types/cliente';
import type { Coluna } from '@/types/departamento';
import {
  LICENCA_VIGENCIA_LABELS,
  LICENCA_VIGENCIA_TONES,
  calcularVigencia,
  type Licenca,
} from '@/types/licenca';
import {
  calcularAvisoPerda,
  PARCELAMENTO_SITUACAO_LABELS,
  PARCELAMENTO_SITUACAO_TONES,
  type Parcelamento,
  type ParcelamentoParcela,
} from '@/types/parcelamento';
import type { Tarefa } from '@/types/tarefa';

type ClientePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ meses?: string }>;
};

const OPCOES_MESES = [3, 6, 12] as const;
const MESES_PADRAO = 6;

export default async function ClientePage({ params, searchParams }: ClientePageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { id } = await params;
  const { meses: mesesParam } = await searchParams;
  const mostrarTodos = mesesParam === 'todos';
  const meses = mostrarTodos ? null : Number(mesesParam) || MESES_PADRAO;

  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single<Cliente>();
  if (!cliente) {
    notFound();
  }

  const [{ data: vinculos }, { data: profiles }] = await Promise.all([
    supabase.from('cliente_departamentos').select('departamento_id').eq('cliente_id', id),
    supabase.from('profiles').select('id, email, nome'),
  ]);

  const permitidos = await getDepartamentosPermitidos();
  const departamentoIdsVinculados = (vinculos ?? [])
    .map((v) => v.departamento_id)
    .filter((depId) => podeAcessarDepartamento(permitidos, depId));

  const departamentosVisiveis: { id: string; nome: string }[] = [];
  if (departamentoIdsVinculados.length > 0) {
    const { data } = await supabase
      .from('departamentos')
      .select('id, nome')
      .in('id', departamentoIdsVinculados)
      .order('ordem');
    departamentosVisiveis.push(...(data ?? []));
  }

  async function buscarTarefasDoDepartamento(departamentoId: string) {
    const query = supabase
      .from('tarefas')
      .select('*')
      .eq('cliente_id', id)
      .eq('departamento_id', departamentoId)
      .order('competencia', { ascending: false });
    const { data } = await (meses !== null ? query.limit(meses) : query).returns<Tarefa[]>();
    return data ?? [];
  }

  const enderecoCompleto = [cliente.endereco, cliente.complemento, cliente.bairro]
    .filter(Boolean)
    .join(', ');
  const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/');
  const detalhesCliente: [string, string][] = (
    [
      ['Código Cliente Alterdata', cliente.codigo],
      ['IE', cliente.inscricao_estadual],
      ['Tipo Cálc. IR', cliente.tipo_calculo_ir],
      ['Telefone', cliente.telefone],
      ['Endereço', enderecoCompleto],
      ['Cidade', cidadeUf],
      ['CEP', cliente.cep],
    ] as [string, string | null][]
  ).filter((par): par is [string, string] => Boolean(par[1]));

  // Licenças aparecem independentemente do vínculo cliente x departamento; o
  // RLS já restringe aos departamentos que o usuário acessa. Traz tudo
  // (inclusive vencidas e canceladas) pra servir de histórico.
  const [{ data: licencasCliente }, { data: departamentosAlvara }] = await Promise.all([
    supabase
      .from('licencas')
      .select('*')
      .eq('cliente_id', id)
      .order('data_vencimento', { ascending: false, nullsFirst: false })
      .returns<Licenca[]>(),
    supabase.from('departamentos').select('id, nome').eq('usa_alvaras', true).eq('status', 'ativo'),
  ]);
  const departamentosAlvaraPermitidos = (departamentosAlvara ?? []).filter((d) =>
    podeAcessarDepartamento(permitidos, d.id),
  );
  const nomeDepartamentoAlvara = new Map(departamentosAlvaraPermitidos.map((d) => [d.id, d.nome]));

  // Mesma ideia dos Alvarás: independe do vínculo cliente x departamento, o
  // RLS já restringe aos departamentos acessíveis. Traz todas as situações
  // (inclusive quitado/perdido/cancelado) pra servir de histórico.
  const [{ data: parcelamentosCliente }, { data: departamentosParcelamento }] = await Promise.all([
    supabase
      .from('parcelamentos')
      .select('*')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .returns<Parcelamento[]>(),
    supabase
      .from('departamentos')
      .select('id, nome')
      .eq('usa_parcelamentos', true)
      .eq('status', 'ativo'),
  ]);
  const departamentosParcelamentoPermitidos = (departamentosParcelamento ?? []).filter((d) =>
    podeAcessarDepartamento(permitidos, d.id),
  );
  const nomeDepartamentoParcelamento = new Map(
    departamentosParcelamentoPermitidos.map((d) => [d.id, d.nome]),
  );

  const parcelamentoIds = (parcelamentosCliente ?? []).map((p) => p.id);
  const { data: parcelasDosParcelamentos } =
    parcelamentoIds.length > 0
      ? await supabase
          .from('parcelamento_parcelas')
          .select('*')
          .in('parcelamento_id', parcelamentoIds)
          .returns<ParcelamentoParcela[]>()
      : { data: [] as ParcelamentoParcela[] };
  const parcelasPorParcelamento = new Map<string, ParcelamentoParcela[]>();
  for (const parcela of parcelasDosParcelamentos ?? []) {
    parcelasPorParcelamento.set(parcela.parcelamento_id, [
      ...(parcelasPorParcelamento.get(parcela.parcelamento_id) ?? []),
      parcela,
    ]);
  }

  const compilados = await Promise.all(
    departamentosVisiveis.map(async (dep) => {
      const [{ data: colunas }, tarefas] = await Promise.all([
        supabase
          .from('colunas')
          .select('*')
          .eq('departamento_id', dep.id)
          .order('status')
          .order('ordem')
          .returns<Coluna[]>(),
        buscarTarefasDoDepartamento(dep.id),
      ]);
      return { departamento: dep, colunas: colunas ?? [], tarefas };
    }),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <Breadcrumbs
        items={[{ label: 'Clientes', href: '/clientes' }, { label: cliente.nome_fantasia }]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {cliente.nome_fantasia}
            {cliente.status === 'inativo' ? ' (inativo)' : ''}
            <ClienteDriveLink url={cliente.google_drive_url} size={18} />
          </h1>
          <p className="text-sm text-muted">
            {cliente.razao_social} — {formatDocumento(cliente.cnpj)}
          </p>
          {detalhesCliente.length > 0 ? (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {detalhesCliente.map(([label, valor]) => (
                <div key={label} className="flex gap-1">
                  <dt className="font-medium text-foreground">{label}:</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {podeGerenciarClientes(profile) ? (
          <Link href={`/clientes/${id}/editar`} className="text-sm text-muted hover:underline">
            Editar cadastro / departamentos
          </Link>
        ) : null}
      </div>

      {compilados.length > 0 ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Mostrar:</span>
          {OPCOES_MESES.map((n) => (
            <Link
              key={n}
              href={`/clientes/${id}?meses=${n}`}
              className={`rounded-full px-3 py-1.5 ${!mostrarTodos && meses === n ? 'bg-accent font-medium text-accent-foreground' : 'bg-surface-muted text-foreground/70 hover:bg-surface-muted/70'}`}
            >
              {n} meses
            </Link>
          ))}
          <Link
            href={`/clientes/${id}?meses=todos`}
            className={`rounded-full px-3 py-1.5 ${mostrarTodos ? 'bg-accent font-medium text-accent-foreground' : 'bg-surface-muted text-foreground/70 hover:bg-surface-muted/70'}`}
          >
            Todos
          </Link>
        </div>
      ) : null}

      {departamentosAlvaraPermitidos.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Alvarás e licenças</h2>
          {(licencasCliente ?? []).length === 0 ? (
            <p className="text-sm text-muted">
              Nenhuma licença ou alvará registrado para este cliente.
            </p>
          ) : (
            <div className="app-card overflow-x-auto">
              <table className="app-table w-full min-w-max border-collapse">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Órgão</th>
                    <th>Número</th>
                    <th>Emissão</th>
                    <th>Vencimento</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(licencasCliente ?? []).map((licenca) => {
                    const vigencia = calcularVigencia(licenca);
                    const formatar = (d: string | null) =>
                      d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '—';
                    return (
                      <tr key={licenca.id}>
                        <td className="font-medium">
                          {licenca.tipo}
                          {departamentosAlvaraPermitidos.length > 1 ? (
                            <span className="block text-xs font-normal text-muted">
                              {nomeDepartamentoAlvara.get(licenca.departamento_id)}
                            </span>
                          ) : null}
                        </td>
                        <td className="text-foreground/80">{licenca.orgao_emissor ?? '—'}</td>
                        <td className="text-foreground/80">{licenca.numero ?? '—'}</td>
                        <td className="whitespace-nowrap text-foreground/80">
                          {formatar(licenca.data_emissao)}
                        </td>
                        <td className="whitespace-nowrap text-foreground/80">
                          {formatar(licenca.data_vencimento)}
                        </td>
                        <td>
                          <Badge tone={LICENCA_VIGENCIA_TONES[vigencia]}>
                            {LICENCA_VIGENCIA_LABELS[vigencia]}
                          </Badge>
                        </td>
                        <td>
                          <Link
                            href={`/alvaras/${licenca.id}/editar`}
                            className="text-sm text-muted hover:underline"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {departamentosParcelamentoPermitidos.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Parcelamentos</h2>
          {(parcelamentosCliente ?? []).length === 0 ? (
            <p className="text-sm text-muted">Nenhum parcelamento registrado para este cliente.</p>
          ) : (
            <div className="app-card overflow-x-auto">
              <table className="app-table w-full min-w-max border-collapse">
                <thead>
                  <tr>
                    <th>Origem</th>
                    <th>Nº parcelamento</th>
                    <th>Parcela</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(parcelamentosCliente ?? []).map((parcelamento) => {
                    const historico = parcelasPorParcelamento.get(parcelamento.id) ?? [];
                    const ultima = [...historico].sort((a, b) =>
                      a.competencia < b.competencia ? 1 : -1,
                    )[0];
                    const avisoPerda = calcularAvisoPerda(parcelamento, historico);
                    return (
                      <tr key={parcelamento.id}>
                        <td className="font-medium">
                          {parcelamento.origem}
                          {departamentosParcelamentoPermitidos.length > 1 ? (
                            <span className="block text-xs font-normal text-muted">
                              {nomeDepartamentoParcelamento.get(parcelamento.departamento_id)}
                            </span>
                          ) : null}
                        </td>
                        <td className="text-foreground/80">
                          {parcelamento.numero_parcelamento ?? '—'}
                        </td>
                        <td className="text-foreground/80 whitespace-nowrap">
                          {ultima ? `${ultima.numero_parcela}/${parcelamento.quantidade_parcelas}` : '—'}
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={PARCELAMENTO_SITUACAO_TONES[parcelamento.situacao]}>
                              {PARCELAMENTO_SITUACAO_LABELS[parcelamento.situacao]}
                            </Badge>
                            {avisoPerda ? (
                              <Badge tone="pending">
                                {avisoPerda.mesesEmAberto}/{avisoPerda.tolerancia} em aberto
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <Link
                            href={`/parcelamentos/${parcelamento.id}/editar`}
                            className="text-sm text-muted hover:underline"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {compilados.length === 0 ? (
        <p className="text-sm text-muted">
          Este cliente ainda não está vinculado a nenhum departamento que você tenha acesso.
        </p>
      ) : (
        compilados.map(({ departamento, colunas, tarefas }) => (
          <div key={departamento.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{departamento.nome}</h2>
            {colunas.length === 0 || tarefas.length === 0 ? (
              <p className="text-sm text-muted">
                {colunas.length === 0
                  ? 'Departamento ainda sem colunas configuradas.'
                  : 'Nenhuma tarefa registrada ainda para este cliente neste departamento.'}
              </p>
            ) : (
              <div className="app-card overflow-x-auto">
                <table className="app-table w-full min-w-max border-collapse">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      {colunas.map((coluna) => (
                        <th key={coluna.id}>
                          {coluna.nome}
                          {coluna.status === 'inativo' ? (
                            <Badge tone="neutral"> inativa</Badge>
                          ) : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tarefas.map((tarefa) => (
                      <tr key={tarefa.id}>
                        <td className="font-medium whitespace-nowrap">
                          {formatCompetencia(tarefa.competencia)}
                        </td>
                        {colunas.map((coluna) => (
                          <td key={coluna.id} className="text-foreground/80">
                            {resolveDisplayValue(
                              coluna.tipo,
                              tarefa.valores?.[coluna.id],
                              profiles ?? [],
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
