// Backup diário completo do projeto — roda fora do Next.js, disparado pelo
// GitHub Actions (.github/workflows/backup-diario.yml), nunca pela própria
// aplicação (serverless não tem o binário pg_dump nem tempo de execução
// garantido pra isso). Produz um .zip com:
//   - banco-public.sql   → schema + dados de public (as tabelas do app)
//   - banco-auth.sql     → só dados de auth (quem pode logar) — o schema já
//                           vem pronto em qualquer projeto Supabase novo,
//                           dar CREATE TABLE de novo quebraria a restauração
//   - banco-storage.sql  → só dados de storage (metadados dos arquivos:
//                           bucket, caminho, tamanho) — mesmo motivo acima
//   - arquivos/          → o conteúdo de verdade de cada bucket, baixado
//                           via API (não existe dentro do Postgres)
// Sobe pro Google Drive e grava o resultado em public.backup_logs, pra
// aparecer em /admin/backups dentro do Contferr.
import { execFileSync } from 'node:child_process';
import { createReadStream, mkdtempSync, writeFileSync, statSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import JSZip from 'jszip';

function obrigatorio(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  return valor;
}

const SUPABASE_DB_URL = obrigatorio('SUPABASE_DB_URL');
const SUPABASE_URL = obrigatorio('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = obrigatorio('SUPABASE_SERVICE_ROLE_KEY');
// OAuth na conta pessoal do dono do Drive, não conta de serviço — conta de
// serviço não tem cota de armazenamento própria em Drive pessoal (só
// funciona com Shared Drive, recurso exclusivo do Google Workspace pago).
// Fazendo como o dono de verdade, o arquivo usa o espaço dele normalmente.
const GOOGLE_CLIENT_ID = obrigatorio('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = obrigatorio('GOOGLE_CLIENT_SECRET');
const GOOGLE_DRIVE_FOLDER_ID = obrigatorio('GOOGLE_DRIVE_FOLDER_ID');
const RETENCAO_DIAS = Number(process.env.BACKUP_RETENCAO_DIAS ?? '30');
const DISPARADO_MANUALMENTE = process.env.DISPARADO_MANUALMENTE === 'true';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function registrarInicio() {
  const { data, error } = await supabase
    .from('backup_logs')
    .insert({ status: 'em_andamento', disparado_manualmente: DISPARADO_MANUALMENTE })
    .select('id')
    .single();
  if (error) throw new Error(`Falha ao registrar início do backup: ${error.message}`);
  return data.id;
}

async function registrarFim(id, resultado) {
  await supabase
    .from('backup_logs')
    .update({ concluido_em: new Date().toISOString(), ...resultado })
    .eq('id', id);
}

function rodarPgDump(destino, args) {
  execFileSync('pg_dump', [SUPABASE_DB_URL, ...args, '-f', destino], { stdio: 'inherit' });
}

// Lista recursivamente os arquivos de um bucket — pastas vêm com id:null
// na resposta do storage-js, sem outro jeito confiável de distinguir de um
// arquivo de verdade.
async function listarArquivosRecursivo(bucket, prefixo = '') {
  const { data, error } = await supabase.storage.from(bucket).list(prefixo, { limit: 1000 });
  if (error) throw new Error(`Falha ao listar ${bucket}/${prefixo}: ${error.message}`);

  const arquivos = [];
  for (const item of data ?? []) {
    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.id === null) {
      arquivos.push(...(await listarArquivosRecursivo(bucket, caminho)));
    } else {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

async function baixarArquivosStorage(pastaDestino) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Falha ao listar buckets: ${error.message}`);

  let total = 0;
  for (const bucket of buckets ?? []) {
    const caminhos = await listarArquivosRecursivo(bucket.id);
    for (const caminho of caminhos) {
      const { data: blob, error: erroDownload } = await supabase.storage
        .from(bucket.id)
        .download(caminho);
      if (erroDownload) {
        console.warn(`Aviso: não foi possível baixar ${bucket.id}/${caminho}: ${erroDownload.message}`);
        continue;
      }
      const destino = path.join(pastaDestino, bucket.id, caminho);
      await mkdir(path.dirname(destino), { recursive: true });
      await writeFile(destino, Buffer.from(await blob.arrayBuffer()));
      total += 1;
    }
  }
  return total;
}

async function zipPasta(pasta, zip, prefixoZip = '') {
  const entradas = await readdir(pasta, { withFileTypes: true });
  for (const entrada of entradas) {
    const caminhoCompleto = path.join(pasta, entrada.name);
    const caminhoZip = prefixoZip ? `${prefixoZip}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) {
      await zipPasta(caminhoCompleto, zip, caminhoZip);
    } else {
      const { readFile } = await import('node:fs/promises');
      zip.file(caminhoZip, await readFile(caminhoCompleto));
    }
  }
}

// Lido do banco (não de um secret fixo) — o botão "Autorizar Google Drive"
// em /admin/backups grava o token mais recente ali a cada renovação, sem
// precisar tocar em nenhum secret do GitHub.
async function buscarRefreshToken() {
  const { data, error } = await supabase
    .from('integracao_google_drive')
    .select('refresh_token')
    .eq('id', true)
    .single();
  if (error) throw new Error(`Falha ao buscar o refresh token: ${error.message}`);
  if (!data.refresh_token) {
    throw new Error(
      'Google Drive ainda não autorizado — abra /admin/backups e clique em "Autorizar Google Drive".',
    );
  }
  return data.refresh_token;
}

async function clienteDrive() {
  const refreshToken = await buscarRefreshToken();
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth });
}

// O Drive ocasionalmente devolve um 5xx passageiro (erro do lado do Google,
// não nosso) — tenta de novo algumas vezes com espera curta antes de
// desistir, em vez de falhar o backup inteiro por uma instabilidade de
// alguns segundos.
async function comRetentativa(fn, tentativas = 3, esperaMs = 5000) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (erro) {
      const codigo = erro?.response?.status ?? erro?.code;
      const ehTransitorio = typeof codigo === 'number' && codigo >= 500;
      if (!ehTransitorio || i === tentativas) throw erro;
      console.warn(`Tentativa ${i} falhou (status ${codigo}), tentando de novo em ${esperaMs / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }
}

async function subirParaDrive(caminhoZip, nomeArquivo) {
  const drive = await clienteDrive();

  const resposta = await comRetentativa(() =>
    drive.files.create({
      requestBody: { name: nomeArquivo, parents: [GOOGLE_DRIVE_FOLDER_ID] },
      media: { mimeType: 'application/zip', body: createReadStream(caminhoZip) },
      fields: 'id, webViewLink',
    }),
  );

  return { id: resposta.data.id, url: resposta.data.webViewLink };
}

async function removerBackupsAntigos() {
  const drive = await clienteDrive();

  const limite = new Date(Date.now() - RETENCAO_DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await drive.files.list({
    q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and createdTime < '${limite}' and trashed = false`,
    fields: 'files(id, name)',
  });
  for (const arquivo of data.files ?? []) {
    await drive.files.delete({ fileId: arquivo.id });
    console.log(`Backup antigo removido: ${arquivo.name}`);
  }
}

async function main() {
  const backupId = await registrarInicio();

  try {
    const pastaTmp = mkdtempSync(path.join(tmpdir(), 'contferr-backup-'));

    console.log('Gerando dump do banco…');
    // --inserts: INSERT normal em vez de COPY ... FROM stdin — COPY só
    // funciona através do protocolo do psql; restaurar com um client de
    // Postgres comum (scripts/restaurar-backup.mjs) exige SQL executável
    // direto, sem depender do psql estar instalado em quem for restaurar.
    rodarPgDump(path.join(pastaTmp, 'banco-public.sql'), [
      '--schema=public',
      '--no-owner',
      '--no-privileges',
      '--inserts',
    ]);
    rodarPgDump(path.join(pastaTmp, 'banco-auth.sql'), [
      '--schema=auth',
      '--data-only',
      '--no-owner',
      '--no-privileges',
      '--inserts',
    ]);
    rodarPgDump(path.join(pastaTmp, 'banco-storage.sql'), [
      '--schema=storage',
      '--data-only',
      '--no-owner',
      '--no-privileges',
      '--inserts',
    ]);

    console.log('Baixando arquivos do Storage…');
    const pastaArquivos = path.join(pastaTmp, 'arquivos');
    await mkdir(pastaArquivos, { recursive: true });
    const totalArquivos = await baixarArquivosStorage(pastaArquivos);
    console.log(`${totalArquivos} arquivo(s) de Storage baixado(s).`);

    const hoje = new Date().toISOString().slice(0, 10);
    writeFileSync(
      path.join(pastaTmp, 'manifesto.json'),
      JSON.stringify({ data: hoje, totalArquivosStorage: totalArquivos }, null, 2),
    );

    console.log('Compactando…');
    const zip = new JSZip();
    await zipPasta(pastaTmp, zip);
    const caminhoZip = path.join(pastaTmp, `backup-${hoje}.zip`);
    const conteudoZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    writeFileSync(caminhoZip, conteudoZip);
    const tamanho = statSync(caminhoZip).size;

    console.log('Enviando pro Google Drive…');
    const { id: driveId, url: driveUrl } = await subirParaDrive(caminhoZip, `backup-${hoje}.zip`);

    console.log('Removendo backups antigos do Drive…');
    await removerBackupsAntigos();

    await registrarFim(backupId, {
      status: 'sucesso',
      drive_arquivo_id: driveId,
      drive_arquivo_url: driveUrl,
      tamanho_bytes: tamanho,
    });
    console.log('Backup concluído com sucesso.');
  } catch (erro) {
    console.error('Backup falhou:', erro);
    await registrarFim(backupId, { status: 'erro', mensagem_erro: String(erro?.message ?? erro) });
    process.exit(1);
  }
}

main();
