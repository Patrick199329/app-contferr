// Migração única (não faz parte da rotina diária) dos dados reais do
// ambiente local pro projeto novo no Supabase Cloud — decisão explícita do
// cliente: só dados de negócio, nenhuma conta de usuário é copiada (as
// contas de teste locais não devem virar credenciais válidas em produção).
//
// Isso cria um problema pontual: 3 tabelas exigem um "criado_por" (não
// aceitam nulo) — quadro_tarefas, quadro_tarefas_recorrencias e processos.
// Resolvido criando UM perfil placeholder ("Sistema — dados migrados") só
// pra satisfazer essa coluna nesses registros antigos; os campos de
// responsável (esses sim opcionais) ficam vazios — a equipe reatribui
// depois de criar as contas reais.
import { createClient } from '@supabase/supabase-js';

// Chave padrão do `supabase start` local (mesma pra qualquer instalação —
// documentada publicamente pelo Supabase CLI, não é segredo do projeto),
// mesmo assim lida do ambiente em vez de escrita aqui, pra não acionar
// scanners de segredo em commits futuros.
const LOCAL_URL = process.env.LOCAL_SUPABASE_URL ?? 'http://127.0.0.1:40321';
const LOCAL_SERVICE_KEY = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

const CLOUD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLOUD_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!LOCAL_SERVICE_KEY || !CLOUD_URL || !CLOUD_SERVICE_KEY) {
  throw new Error(
    'Defina LOCAL_SUPABASE_SERVICE_ROLE_KEY (chave local) e NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (projeto na nuvem) no ambiente.',
  );
}

const local = createClient(LOCAL_URL, LOCAL_SERVICE_KEY, { auth: { persistSession: false } });
const cloud = createClient(CLOUD_URL, CLOUD_SERVICE_KEY, { auth: { persistSession: false } });

function limparColunasUsuario(linha, colunas) {
  const copia = { ...linha };
  for (const c of colunas) copia[c] = null;
  return copia;
}

async function inserirEmLotes(tabela, linhas, tamanhoLote = 500) {
  if (linhas.length === 0) return 0;
  for (let i = 0; i < linhas.length; i += tamanhoLote) {
    const lote = linhas.slice(i, i + tamanhoLote);
    const { error } = await cloud.from(tabela).insert(lote);
    if (error) throw new Error(`Falha ao inserir em ${tabela}: ${error.message}`);
  }
  return linhas.length;
}

async function copiarTabela(tabela, transformar = (x) => x) {
  const { data, error } = await local.from(tabela).select('*');
  if (error) throw new Error(`Falha ao ler ${tabela} do local: ${error.message}`);
  const linhas = (data ?? []).map(transformar);

  // Reexecutável: se a tabela já tem a mesma quantidade (ou mais) de linhas
  // na nuvem, assume que essa etapa já rodou numa tentativa anterior e pula
  // — sem isso, rodar de novo depois de um erro no meio duplicaria tudo.
  const { count } = await cloud.from(tabela).select('*', { count: 'exact', head: true });
  if ((count ?? 0) >= linhas.length && linhas.length > 0) {
    console.log(`${tabela}: já tem ${count} linha(s) na nuvem, pulando.`);
    return count;
  }

  const total = await inserirEmLotes(tabela, linhas);
  console.log(`${tabela}: ${total} linha(s) copiada(s).`);
  return total;
}

async function criarPlaceholderSistema() {
  const email = 'sistema-migracao@contferr.local';
  const { data: existente } = await cloud.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existente) return existente.id;

  const { data, error } = await cloud.auth.admin.createUser({
    email,
    password: crypto.randomUUID(), // ninguém precisa logar com essa conta
    email_confirm: true,
    user_metadata: { nome: 'Sistema (dados migrados)' },
  });
  if (error) throw new Error(`Falha ao criar perfil placeholder: ${error.message}`);

  await cloud.from('profiles').update({ nome: 'Sistema (dados migrados)', status: 'ativo' }).eq('id', data.user.id);
  console.log('Perfil placeholder "Sistema (dados migrados)" criado.');
  return data.user.id;
}

async function limparDepartamentosPlaceholder(totalReal) {
  const { count } = await cloud.from('departamentos').select('*', { count: 'exact', head: true });
  // Só limpa se o que já existe for claramente só o placeholder da
  // migration de bootstrap (bem menor que o total real) — evita apagar os
  // departamentos reais se essa etapa for executada de novo por engano.
  if ((count ?? 0) >= totalReal) {
    console.log('departamentos: já migrados, não vou limpar.');
    return;
  }
  const { error } = await cloud.from('departamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`Falha ao limpar departamentos placeholder: ${error.message}`);
}

async function copiarStorageBranding() {
  const { data: arquivos, error } = await local.storage.from('branding').list('', { limit: 1000 });
  if (error) throw new Error(`Falha ao listar storage local: ${error.message}`);
  let total = 0;
  for (const arquivo of arquivos ?? []) {
    if (arquivo.id === null) continue; // pasta, não arquivo
    const { data: blob, error: eDown } = await local.storage.from('branding').download(arquivo.name);
    if (eDown) {
      console.warn(`Aviso: não baixou ${arquivo.name}: ${eDown.message}`);
      continue;
    }
    const { error: eUp } = await cloud.storage
      .from('branding')
      .upload(arquivo.name, blob, { upsert: true, contentType: blob.type });
    if (eUp) {
      console.warn(`Aviso: não subiu ${arquivo.name}: ${eUp.message}`);
      continue;
    }
    total += 1;
  }
  console.log(`storage (branding): ${total} arquivo(s) copiado(s).`);
}

async function main() {
  console.log('Criando perfil placeholder…');
  const placeholderId = await criarPlaceholderSistema();

  const { count: totalDepartamentosLocal } = await local
    .from('departamentos')
    .select('*', { count: 'exact', head: true });
  console.log('Limpando departamentos placeholder da migration de bootstrap…');
  await limparDepartamentosPlaceholder(totalDepartamentosLocal ?? 0);

  // Ordem importa: tabela-pai antes da tabela-filha (FK).
  await copiarTabela('departamentos', (d) => d); // já vem ordenado por parent_id null primeiro na maioria dos casos
  await copiarTabela('colunas');
  await copiarTabela('opcoes_coluna');
  await copiarTabela('clientes');
  await copiarTabela('cliente_departamentos', (r) =>
    limparColunasUsuario(r, ['responsavel_padrao_id']),
  );
  await copiarTabela('funcionarios');
  await copiarTabela('tarefas', (r) => limparColunasUsuario(r, ['responsavel_padrao_id', 'updated_by']));
  await copiarTabela('quadro_tarefas_campos');
  await copiarTabela('quadro_tarefas_campos_opcoes');
  await copiarTabela('quadro_tarefas_recorrencias', (r) => ({
    ...limparColunasUsuario(r, ['responsavel_id']),
    criado_por: placeholderId,
  }));
  await copiarTabela('quadro_tarefas', (r) => {
    // "numero" é identity (generated always) — não aceita valor explícito via
    // insert comum; a nuvem gera uma sequência nova própria.
    const { numero: _numero, ...resto } = limparColunasUsuario(r, ['responsavel_id']);
    return { ...resto, criado_por: placeholderId };
  });
  await copiarTabela('tipos_processo');
  await copiarTabela('etapas_modelo');
  await copiarTabela('processos', (r) => ({
    ...limparColunasUsuario(r, ['responsavel_id']),
    criado_por: placeholderId,
  }));
  await copiarTabela('processo_etapas');
  await copiarTabela('processo_taxas_jucemg');
  await copiarTabela('processo_eventos', (r) => limparColunasUsuario(r, ['criado_por']));
  await copiarTabela('licencas', (r) => limparColunasUsuario(r, ['responsavel_id', 'criado_por']));
  await copiarTabela('parcelamentos', (r) => limparColunasUsuario(r, ['responsavel_id', 'criado_por']));
  await copiarTabela('parcelamento_parcelas');

  // Singletons já existem (criados pela própria migration) — atualiza em vez
  // de inserir.
  const { data: marcaLocal } = await local.from('configuracoes_marca').select('*').single();
  if (marcaLocal) {
    const { updated_by: _updatedBy, ...resto } = marcaLocal;
    await cloud.from('configuracoes_marca').update(resto).eq('id', true);
    console.log('configuracoes_marca: atualizado.');
  }
  const { data: sistemaLocal } = await local.from('configuracoes_sistema').select('*').single();
  if (sistemaLocal) {
    const { updated_by: _updatedBy, ...resto } = sistemaLocal;
    await cloud.from('configuracoes_sistema').update(resto).eq('id', true);
    console.log('configuracoes_sistema: atualizado.');
  }

  console.log('Copiando arquivos do Storage (branding)…');
  await copiarStorageBranding();

  console.log('\nMigração concluída.');
}

main().catch((erro) => {
  console.error('ERRO NA MIGRAÇÃO:', erro.message);
  process.exit(1);
});
