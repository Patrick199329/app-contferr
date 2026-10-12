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
const GOOGLE_SERVICE_ACCOUNT_JSON = obrigatorio('GOOGLE_SERVICE_ACCOUNT_JSON');
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

async function subirParaDrive(caminhoZip, nomeArquivo) {
  const credenciais = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials: credenciais,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const resposta = await drive.files.create({
    requestBody: { name: nomeArquivo, parents: [GOOGLE_DRIVE_FOLDER_ID] },
    media: { mimeType: 'application/zip', body: createReadStream(caminhoZip) },
    fields: 'id, webViewLink',
  });

  return { id: resposta.data.id, url: resposta.data.webViewLink };
}

async function removerBackupsAntigos() {
  const credenciais = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials: credenciais,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  const drive = google.drive({ version: 'v3', auth });

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
    rodarPgDump(path.join(pastaTmp, 'banco-public.sql'), ['--schema=public', '--no-owner', '--no-privileges']);
    rodarPgDump(path.join(pastaTmp, 'banco-auth.sql'), ['--schema=auth', '--data-only', '--no-owner', '--no-privileges']);
    rodarPgDump(path.join(pastaTmp, 'banco-storage.sql'), ['--schema=storage', '--data-only', '--no-owner', '--no-privileges']);

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
