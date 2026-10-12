import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ClienteCredenciaisForm } from '@/components/cliente-credenciais-form';
import { ClienteForm } from '@/components/cliente-form';
import { FuncionarioForm } from '@/components/funcionario-form';
import { FuncionarioItem } from '@/components/funcionario-item';
import { ResponsavelPadraoCell } from '@/components/responsavel-padrao-cell';
import { formatCpf, onlyDigits } from '@/lib/cnpj';
import { caminhoInternoSeguro } from '@/lib/safe-redirect';
import {
  getDepartamentosPermitidos,
  getMembrosDoDepartamento,
  podeAcessarDepartamento,
  type MembroDepartamento,
} from '@/lib/supabase/permissoes';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Cliente } from '@/types/cliente';
import type { Funcionario } from '@/types/funcionario';
import {
  createFuncionario,
  linkClienteDepartamento,
  setFuncionarioStatus,
  unlinkClienteDepartamento,
  updateCliente,
  updateClienteCredenciais,
  updateResponsavelPadrao,
} from '../../actions';

type EditarClientePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; voltar?: string }>;
};

export default async function EditarClientePage({ params, searchParams }: EditarClientePageProps) {
  const profile = await getCurrentProfile();
  if (!podeGerenciarClientes(profile)) {
    redirect('/clientes');
  }

  const { id } = await params;
  const { erro, voltar } = await searchParams;
  const voltarSeguro = caminhoInternoSeguro(voltar);
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single<Cliente>();

  if (!cliente) {
    notFound();
  }

  const [{ data: departamentos }, { data: vinculos }, { data: minhasPermissoes }, { data: profiles }] =
    await Promise.all([
      supabase
        .from('departamentos')
        .select('id, nome, parent_id, usa_funcionarios')
        .eq('status', 'ativo')
        .order('ordem'),
      supabase
        .from('cliente_departamentos')
        .select('departamento_id, responsavel_padrao_id')
        .eq('cliente_id', id),
      profile?.role === 'gerente'
        ? supabase.from('permissoes').select('departamento_id').eq('usuario_id', profile.id)
        : Promise.resolve({ data: null }),
      supabase.from('profiles').select('id, nome, email'),
    ]);

  // Resolve o nome de quem já está atribuído mesmo que essa pessoa não
  // apareça mais em membrosPorDepartamento (perdeu acesso ao departamento
  // depois de ter sido definida como responsável) — mesma ideia de
  // components/tarefas-table.tsx.
  const nomePorId = new Map((profiles ?? []).map((p) => [p.id, p.nome || p.email]));

  const departamentosVinculados = new Set((vinculos ?? []).map((v) => v.departamento_id));
  const responsavelPadraoPorDepartamento = new Map(
    (vinculos ?? []).map((v) => [v.departamento_id, v.responsavel_padrao_id]),
  );

  const membrosPorDepartamentoEntries = await Promise.all(
    [...departamentosVinculados].map(
      async (depId) => [depId, await getMembrosDoDepartamento(depId)] as const,
    ),
  );
  const membrosPorDepartamento: Record<string, MembroDepartamento[]> = Object.fromEntries(
    membrosPorDepartamentoEntries,
  );

  // Gerência concedida no departamento pai vale também para os filhos.
  const diretos = new Set((minhasPermissoes ?? []).map((p) => p.departamento_id));
  const gerenciaExpandida = new Set(diretos);
  for (const dep of departamentos ?? []) {
    if (dep.parent_id && diretos.has(dep.parent_id)) {
      gerenciaExpandida.add(dep.id);
    }
  }
  const departamentosQueGerencio =
    profile?.role === 'admin'
      ? null // null = todos
      : gerenciaExpandida;

  // Seção "Funcionários" só aparece se o cliente estiver vinculado a algum
  // departamento "usa_funcionarios" que o usuário atual acesse — mesma regra
  // usada pela RLS da tabela funcionarios (pode_acessar_departamento()), pra
  // não mostrar uma seção vazia que na verdade só está sendo escondida pelo
  // RLS.
  const permitidos = await getDepartamentosPermitidos();
  const deptosFuncionariosAcessiveis = (departamentos ?? []).filter(
    (dep) =>
      dep.usa_funcionarios &&
      departamentosVinculados.has(dep.id) &&
      podeAcessarDepartamento(permitidos, dep.id),
  );
  const mostrarFuncionarios = deptosFuncionariosAcessiveis.length > 0;

  const { data: funcionarios } = mostrarFuncionarios
    ? await supabase
        .from('funcionarios')
        .select('*')
        .eq('cliente_id', id)
        .order('ordem')
        .returns<Funcionario[]>()
    : { data: null };

  // Botão "Cliente principal" no formulário de Funcionário: só faz sentido
  // preencher o CPF quando o documento do cliente É um CPF (pessoa física,
  // 11 dígitos) — um CNPJ de 14 dígitos não é o CPF de ninguém.
  const clienteCpfDigits = onlyDigits(cliente.cnpj);
  const clienteCpfParaFuncionario = clienteCpfDigits.length === 11 ? formatCpf(clienteCpfDigits) : null;

  // Departamento que só agrupa subdepartamentos não tem colunas/tarefas
  // próprias, então não faz sentido oferecê-lo para vínculo — a menos que já
  // exista um vínculo antigo nele, aí mostramos só para permitir desvincular.
  const paisComFilhos = new Set(
    (departamentos ?? []).filter((d) => d.parent_id).map((d) => d.parent_id as string),
  );
  const departamentosExibiveis = (departamentos ?? []).filter((dep) => {
    if (!paisComFilhos.has(dep.id)) return true;
    return departamentosVinculados.has(dep.id);
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: cliente.nome_fantasia, href: `/clientes/${id}` },
          { label: 'Editar' },
        ]}
      />
      <div className="flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Editar cliente</h1>
          {voltarSeguro ? (
            <Link href={voltarSeguro} className="text-sm text-muted hover:underline">
              ← Voltar
            </Link>
          ) : null}
        </div>
        {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}
        <div className="app-card p-6">
          <ClienteForm
            action={updateCliente.bind(null, id, voltarSeguro)}
            initialValues={{
              razaoSocial: cliente.razao_social,
              nomeFantasia: cliente.nome_fantasia,
              cnpj: cliente.cnpj,
              codigo: cliente.codigo,
              inscricaoEstadual: cliente.inscricao_estadual,
              tipoCalculoIr: cliente.tipo_calculo_ir,
              telefone: cliente.telefone,
              cep: cliente.cep,
              endereco: cliente.endereco,
              complemento: cliente.complemento,
              bairro: cliente.bairro,
              cidade: cliente.cidade,
              uf: cliente.uf,
              googleDriveUrl: cliente.google_drive_url,
            }}
            submitLabel="Salvar alterações"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Departamentos vinculados</h2>
          <p className="text-sm text-muted">
            Alterações aqui são salvas automaticamente — não precisa de botão de salvar.
          </p>
        </div>
        <ul className="app-card flex flex-col divide-y divide-border">
          {departamentosExibiveis.map((dep) => {
            const vinculado = departamentosVinculados.has(dep.id);
            const podeAlterar =
              departamentosQueGerencio === null || departamentosQueGerencio.has(dep.id);
            return (
              <li key={dep.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span>{dep.nome}</span>
                <div className="flex items-center gap-3">
                  {vinculado && podeAlterar ? (
                    <ResponsavelPadraoCell
                      key={`${dep.id}-${responsavelPadraoPorDepartamento.get(dep.id) ?? ''}`}
                      membros={membrosPorDepartamento[dep.id] ?? []}
                      initialValue={responsavelPadraoPorDepartamento.get(dep.id) ?? null}
                      initialValueLabel={nomePorId.get(
                        responsavelPadraoPorDepartamento.get(dep.id) ?? '',
                      )}
                      action={updateResponsavelPadrao.bind(null, id, dep.id)}
                    />
                  ) : null}
                  {podeAlterar ? (
                    <form
                      action={
                        vinculado
                          ? unlinkClienteDepartamento.bind(null, id, dep.id)
                          : linkClienteDepartamento.bind(null, id, dep.id)
                      }
                    >
                      <button type="submit" className="text-sm text-muted hover:underline">
                        {vinculado ? 'Desvincular' : 'Vincular'}
                      </button>
                    </form>
                  ) : (
                    <span className="text-sm text-muted">
                      {vinculado ? 'Vinculado' : 'Não vinculado'}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {departamentosExibiveis.length === 0 ? (
            <li className="p-4 text-sm text-muted">Nenhum departamento cadastrado.</li>
          ) : null}
        </ul>
      </div>

      {mostrarFuncionarios ? (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-medium">Acesso a portais (empregador)</h2>
            <p className="text-sm text-muted">
              Credencial usada em atividades de {deptosFuncionariosAcessiveis.map((d) => d.nome).join(', ')}{' '}
              feitas em nome deste cliente (gov.br, eSocial doméstico) — uma só, independente de
              quantos funcionários ele tenha.
            </p>
          </div>
          <div className="app-card p-6">
            <ClienteCredenciaisForm
              action={updateClienteCredenciais.bind(null, id)}
              initialValues={{
                senhaGov: cliente.senha_gov,
                codigoAcesso: cliente.codigo_acesso,
                senha: cliente.senha,
              }}
            />
          </div>
        </div>
      ) : null}

      {mostrarFuncionarios ? (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-medium">Funcionários</h2>
            <p className="text-sm text-muted">Nome e CPF de cada funcionário deste cliente.</p>
          </div>
          <ul className="app-card flex flex-col divide-y divide-border">
            {(funcionarios ?? []).map((funcionario) => (
              <FuncionarioItem
                key={funcionario.id}
                clienteId={id}
                funcionario={funcionario}
                toggleStatusAction={setFuncionarioStatus.bind(
                  null,
                  funcionario.id,
                  id,
                  funcionario.status === 'ativo' ? 'inativo' : 'ativo',
                )}
                clienteNome={cliente.razao_social}
                clienteCpf={clienteCpfParaFuncionario}
              />
            ))}
            {(funcionarios ?? []).length === 0 ? (
              <li className="p-4 text-sm text-muted">Nenhum funcionário cadastrado.</li>
            ) : null}
          </ul>
          <div className="app-card p-6">
            <FuncionarioForm
              action={createFuncionario.bind(null, id)}
              clienteNome={cliente.razao_social}
              clienteCpf={clienteCpfParaFuncionario}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
