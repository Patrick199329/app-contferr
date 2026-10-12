'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isValidDocumento, onlyDigits } from '@/lib/cnpj';
import { currentCompetencia } from '@/lib/competencia';
import { getCurrentProfile, podeGerenciarClientes } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export type ClienteFormState = {
  error: string | null;
};

async function requireGerenciador() {
  const profile = await getCurrentProfile();
  if (!podeGerenciarClientes(profile)) {
    throw new Error('Não autorizado.');
  }
}

type ParsedCliente =
  | {
      ok: true;
      razaoSocial: string;
      nomeFantasia: string;
      cnpj: string;
      codigo: string | null;
      inscricaoEstadual: string | null;
      tipoCalculoIr: string | null;
      telefone: string | null;
      cep: string | null;
      endereco: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      uf: string | null;
      googleDriveUrl: string | null;
      departamentoIds: string[];
    }
  | { ok: false; error: string };

// Campo opcional: string vazia vira null em vez de "" (evita salvar "" como
// se fosse um valor preenchido, e mantém consistente com colunas que já
// começam null pra quem não veio dessa ampliação de cadastro).
function campoOpcional(formData: FormData, nome: string): string | null {
  const valor = String(formData.get(nome) ?? '').trim();
  return valor || null;
}

function parseClienteForm(formData: FormData): ParsedCliente {
  const razaoSocial = String(formData.get('razao_social') ?? '').trim();
  const nomeFantasia = String(formData.get('nome_fantasia') ?? '').trim();
  const cnpj = onlyDigits(String(formData.get('cnpj') ?? ''));
  const departamentoIds = formData.getAll('departamentos').map(String);

  if (!razaoSocial || !nomeFantasia) {
    return { ok: false, error: 'Razão social e nome fantasia são obrigatórios.' };
  }
  if (!isValidDocumento(cnpj)) {
    return { ok: false, error: 'CNPJ/CPF inválido.' };
  }

  return {
    ok: true,
    razaoSocial,
    nomeFantasia,
    cnpj,
    codigo: campoOpcional(formData, 'codigo'),
    inscricaoEstadual: campoOpcional(formData, 'inscricao_estadual'),
    tipoCalculoIr: campoOpcional(formData, 'tipo_calculo_ir'),
    telefone: campoOpcional(formData, 'telefone'),
    cep: campoOpcional(formData, 'cep'),
    endereco: campoOpcional(formData, 'endereco'),
    complemento: campoOpcional(formData, 'complemento'),
    bairro: campoOpcional(formData, 'bairro'),
    cidade: campoOpcional(formData, 'cidade'),
    uf: campoOpcional(formData, 'uf'),
    googleDriveUrl: campoOpcional(formData, 'google_drive_url'),
    departamentoIds,
  };
}

export async function createCliente(
  voltar: string | null,
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireGerenciador();

  const parsed = parseClienteForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({
      razao_social: parsed.razaoSocial,
      nome_fantasia: parsed.nomeFantasia,
      cnpj: parsed.cnpj,
      codigo: parsed.codigo,
      inscricao_estadual: parsed.inscricaoEstadual,
      tipo_calculo_ir: parsed.tipoCalculoIr,
      telefone: parsed.telefone,
      cep: parsed.cep,
      endereco: parsed.endereco,
      complemento: parsed.complemento,
      bairro: parsed.bairro,
      cidade: parsed.cidade,
      uf: parsed.uf,
      google_drive_url: parsed.googleDriveUrl,
    })
    .select('id')
    .single();

  if (error || !cliente) {
    const message =
      error?.code === '23505' ? 'Já existe um cliente com esse CNPJ/CPF.' : error?.message;
    return { error: message ?? 'Erro ao criar cliente.' };
  }

  if (parsed.departamentoIds.length > 0) {
    // Departamento que só agrupa subdepartamentos não recebe vínculo direto
    // (não tem colunas/tarefas próprias — o cliente "sumiria" da Tabela de
    // Tarefas). Filtra silenciosamente em vez de travar a criação do cliente.
    const { data: paisComFilhos } = await supabase
      .from('departamentos')
      .select('parent_id')
      .not('parent_id', 'is', null)
      .in('parent_id', parsed.departamentoIds);
    const idsInvalidos = new Set((paisComFilhos ?? []).map((d) => d.parent_id as string));
    const departamentoIdsValidos = parsed.departamentoIds.filter((id) => !idsInvalidos.has(id));

    if (departamentoIdsValidos.length > 0) {
      await supabase.from('cliente_departamentos').insert(
        departamentoIdsValidos.map((departamentoId) => ({
          cliente_id: cliente.id,
          departamento_id: departamentoId,
          responsavel_padrao_id: String(formData.get(`responsavel_${departamentoId}`) ?? '') || null,
        })),
      );
    }
  }

  revalidatePath('/clientes');

  // Volta pra quem chamou o cadastro (ex.: criação de processo "Novo
  // cliente") já com o cliente recém-criado identificado na querystring, pra
  // quem chamou poder pré-selecioná-lo sem precisar buscar de novo.
  if (voltar) {
    const separador = voltar.includes('?') ? '&' : '?';
    redirect(`${voltar}${separador}cliente=${cliente.id}`);
  }
  redirect('/clientes');
}

export async function updateCliente(
  id: string,
  voltar: string | null,
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireGerenciador();

  const parsed = parseClienteForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clientes')
    .update({
      razao_social: parsed.razaoSocial,
      nome_fantasia: parsed.nomeFantasia,
      cnpj: parsed.cnpj,
      codigo: parsed.codigo,
      inscricao_estadual: parsed.inscricaoEstadual,
      tipo_calculo_ir: parsed.tipoCalculoIr,
      telefone: parsed.telefone,
      cep: parsed.cep,
      endereco: parsed.endereco,
      complemento: parsed.complemento,
      bairro: parsed.bairro,
      cidade: parsed.cidade,
      uf: parsed.uf,
      google_drive_url: parsed.googleDriveUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');

  if (error) {
    const message = error.code === '23505' ? 'Já existe um cliente com esse CNPJ/CPF.' : error.message;
    return { error: message };
  }

  // RLS bloqueia silenciosamente (0 linhas afetadas, sem erro) quando um
  // Gerente tenta editar cliente fora dos departamentos que ele gerencia.
  if (!data || data.length === 0) {
    return { error: 'Você não tem permissão para editar este cliente.' };
  }

  revalidatePath('/clientes');
  revalidatePath('/tarefas');
  redirect(voltar ?? '/clientes');
}

export async function deleteCliente(id: string) {
  await requireGerenciador();

  const supabase = await createClient();

  const [{ count: countTarefas }, { count: countQuadro }] = await Promise.all([
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('cliente_id', id),
    supabase.from('quadro_tarefas').select('*', { count: 'exact', head: true }).eq('cliente_id', id),
  ]);

  if ((countTarefas ?? 0) > 0 || (countQuadro ?? 0) > 0) {
    redirect(
      `/clientes?erro=${encodeURIComponent('Este cliente já tem movimentações registradas — não é possível excluir, só desativar.')}`,
    );
  }

  const { data, error } = await supabase.from('clientes').delete().eq('id', id).select('id');

  if (error) {
    redirect(`/clientes?erro=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/clientes?erro=${encodeURIComponent('Você não tem permissão para excluir este cliente.')}`,
    );
  }

  revalidatePath('/clientes');
}

export async function setClienteStatus(id: string, status: 'ativo' | 'inativo') {
  await requireGerenciador();

  const supabase = await createClient();
  await supabase
    .from('clientes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/clientes');
}

export async function linkClienteDepartamento(clienteId: string, departamentoId: string) {
  await requireGerenciador();

  const supabase = await createClient();

  // Departamento que só agrupa subdepartamentos não tem colunas/tarefas
  // próprias — vincular um cliente direto nele faz o cliente "sumir" da
  // Tabela de Tarefas, já que nenhuma aba selecionável aponta pra ele.
  const { count: temFilhos } = await supabase
    .from('departamentos')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', departamentoId);
  if ((temFilhos ?? 0) > 0) {
    redirect(
      `/clientes/${clienteId}/editar?erro=${encodeURIComponent('Este departamento só agrupa subdepartamentos — vincule o cliente diretamente ao subdepartamento correto.')}`,
    );
  }

  const { data, error } = await supabase
    .from('cliente_departamentos')
    .insert({ cliente_id: clienteId, departamento_id: departamentoId })
    .select('id');

  if (error) {
    redirect(`/clientes/${clienteId}/editar?erro=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/clientes/${clienteId}/editar?erro=${encodeURIComponent('Você não gerencia este departamento.')}`,
    );
  }

  revalidatePath(`/clientes/${clienteId}/editar`);
  revalidatePath('/clientes');
}

export async function unlinkClienteDepartamento(clienteId: string, departamentoId: string) {
  await requireGerenciador();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cliente_departamentos')
    .delete()
    .eq('cliente_id', clienteId)
    .eq('departamento_id', departamentoId)
    .select('id');

  if (error) {
    redirect(`/clientes/${clienteId}/editar?erro=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/clientes/${clienteId}/editar?erro=${encodeURIComponent('Você não gerencia este departamento.')}`,
    );
  }

  revalidatePath(`/clientes/${clienteId}/editar`);
  revalidatePath('/clientes');
}

export async function updateResponsavelPadrao(
  clienteId: string,
  departamentoId: string,
  responsavelId: string | null,
) {
  await requireGerenciador();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cliente_departamentos')
    .update({ responsavel_padrao_id: responsavelId })
    .eq('cliente_id', clienteId)
    .eq('departamento_id', departamentoId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Você não gerencia este departamento.');

  const { data: departamento } = await supabase
    .from('departamentos')
    .select('usa_funcionarios')
    .eq('id', departamentoId)
    .single();

  // Departamentos "usa_funcionarios" só ficam sem uma única linha de tarefa
  // por cliente pra espelhar quando o cliente TEM funcionário cadastrado (a
  // linha nesse caso é por funcionário) — nem todo cliente do departamento
  // tem funcionário (ex.: DP também apura direto do cliente), e esses
  // continuam com 1 linha própria, igual a um departamento comum.
  let temFuncionario = false;
  if (departamento?.usa_funcionarios) {
    const { count } = await supabase
      .from('funcionarios')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', clienteId)
      .eq('status', 'ativo');
    temFuncionario = (count ?? 0) > 0;
  }

  // Espelha no mês corrente da Tabela de Tarefas — upsert (via RPC, não
  // .upsert() direto: a unicidade de `tarefas` virou dois índices parciais
  // depois de Funcionários, e o Supabase-js não sabe mirar um índice
  // parcial via onConflict). Um cliente recém-vinculado pode ainda não ter
  // linha da competência atual (só nasce na próxima virada). Sem isso,
  // editar pelo cadastro não geraria nenhuma mudança em `tarefas`, e a aba
  // já aberta com a Tabela de Tarefas não teria como saber que precisa
  // atualizar (o Realtime escuta `tarefas`, não `cliente_departamentos`).
  // Os dois pontos de edição ficam sincronizados "de agora em diante"; não
  // mexe em nenhum mês passado (Histórico continua com o retrato de cada
  // mês).
  if (!temFuncionario) {
    await supabase.rpc('upsert_responsavel_padrao_mes', {
      p_cliente_id: clienteId,
      p_departamento_id: departamentoId,
      p_competencia: currentCompetencia(),
      p_responsavel_id: responsavelId,
    });
  }

  revalidatePath('/tarefas');
  revalidatePath('/historico');
  revalidatePath(`/clientes/${clienteId}/editar`);
}

export async function updateResponsavelPadraoMes(
  clienteId: string,
  departamentoId: string,
  competencia: string,
  responsavelId: string | null,
) {
  await requireGerenciador();

  const supabase = await createClient();
  // Upsert, não update (via RPC — ver comentário em updateResponsavelPadrao
  // sobre por que não dá mais pra usar .upsert() direto): se o cliente foi
  // vinculado ao departamento no meio do mês, a linha da competência atual
  // ainda não existe (só nasce na próxima virada) — sem isso, editar o
  // Responsável antes disso falharia.
  const { error } = await supabase.rpc('upsert_responsavel_padrao_mes', {
    p_cliente_id: clienteId,
    p_departamento_id: departamentoId,
    p_competencia: competencia,
    p_responsavel_id: responsavelId,
  });

  if (error) throw new Error(error.message);

  // Só espelha no cadastro quando é o mês corrente — evita que um ajuste em
  // mês passado (a Tabela de Tarefas permite editar retroativamente, dentro
  // do limite configurado) "vaze" pro padrão atual do cadastro.
  if (competencia === currentCompetencia()) {
    await supabase
      .from('cliente_departamentos')
      .update({ responsavel_padrao_id: responsavelId })
      .eq('cliente_id', clienteId)
      .eq('departamento_id', departamentoId);
  }

  revalidatePath('/tarefas');
  revalidatePath(`/clientes/${clienteId}/editar`);
}

export type FuncionarioFormState = {
  error: string | null;
};

function parseFuncionarioFormData(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim();
  const cpf = String(formData.get('cpf') ?? '').trim() || null;
  return { nome, cpf };
}

export async function createFuncionario(
  clienteId: string,
  _prevState: FuncionarioFormState,
  formData: FormData,
): Promise<FuncionarioFormState> {
  await requireGerenciador();

  const { nome, cpf } = parseFuncionarioFormData(formData);
  if (!nome) return { error: 'Informe o nome do funcionário.' };

  const supabase = await createClient();
  const { count } = await supabase
    .from('funcionarios')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', clienteId);

  const { error } = await supabase.from('funcionarios').insert({
    cliente_id: clienteId,
    nome,
    cpf,
    ordem: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clienteId}/editar`);
  revalidatePath('/tarefas');
  return { error: null };
}

export async function updateFuncionario(
  funcionarioId: string,
  clienteId: string,
  _prevState: FuncionarioFormState,
  formData: FormData,
): Promise<FuncionarioFormState> {
  await requireGerenciador();

  const { nome, cpf } = parseFuncionarioFormData(formData);
  if (!nome) return { error: 'Informe o nome do funcionário.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('funcionarios')
    .update({
      nome,
      cpf,
      updated_at: new Date().toISOString(),
    })
    .eq('id', funcionarioId);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clienteId}/editar`);
  revalidatePath('/tarefas');
  return { error: null };
}

export type ClienteCredenciaisFormState = {
  error: string | null;
  sucesso?: boolean;
};

// Credenciais de portal (gov.br, eSocial doméstico...) do empregador — uma
// só por cliente, independente de quantos funcionários ele tenha.
export async function updateClienteCredenciais(
  clienteId: string,
  _prevState: ClienteCredenciaisFormState,
  formData: FormData,
): Promise<ClienteCredenciaisFormState> {
  await requireGerenciador();

  const senhaGov = String(formData.get('senha_gov') ?? '').trim() || null;
  const codigoAcesso = String(formData.get('codigo_acesso') ?? '').trim() || null;
  const senha = String(formData.get('senha') ?? '').trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('clientes')
    .update({
      senha_gov: senhaGov,
      codigo_acesso: codigoAcesso,
      senha,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clienteId);

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clienteId}/editar`);
  return { error: null, sucesso: true };
}

export async function setFuncionarioStatus(
  funcionarioId: string,
  clienteId: string,
  status: 'ativo' | 'inativo',
) {
  await requireGerenciador();

  const supabase = await createClient();
  await supabase
    .from('funcionarios')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', funcionarioId);

  revalidatePath(`/clientes/${clienteId}/editar`);
  revalidatePath('/tarefas');
}
