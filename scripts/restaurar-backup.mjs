// Restaura um .zip gerado por scripts/backup-diario.mjs num projeto Supabase
// NOVO e vazio (sem nenhuma migration aplicada — o próprio banco-public.sql
// já recria toda a estrutura: tabelas, RLS, funções). Rodado manualmente,
// só quando precisar de verdade (teste de restauração ou recuperação real).
//
// Ordem importa: auth antes de public (profiles referencia auth.users),
// storage pode vir em qualquer ordem em relação aos dois.
//
// Uso:
//   RESTORE_ZIP=caminho/do/backup-2026-10-12.zip \
//   RESTORE_DB_URL="postgresql://postgres.xxx:senha@aws-X-regiao.pooler.supabase.com:5432/postgres" \
//   RESTORE_SUPABASE_URL=https://xxx.supabase.co \
//   RESTORE_SERVICE_ROLE_KEY=... \
//   node scripts/restaurar-backup.mjs
import { mkdtempSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { Client } from 'pg';

function obrigatorio(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  return valor;
}

const RESTORE_ZIP = obrigatorio('RESTORE_ZIP');
const RESTORE_DB_URL = obrigatorio('RESTORE_DB_URL');
const RESTORE_SUPABASE_URL = obrigatorio('RESTORE_SUPABASE_URL');
const RESTORE_SERVICE_ROLE_KEY = obrigatorio('RESTORE_SERVICE_ROLE_KEY');

async function extrairZip(caminhoZip) {
  const pastaTmp = mkdtempSync(path.join(tmpdir(), 'contferr-restore-'));
  const conteudo = readFileSync(caminhoZip);
  const zip = await JSZip.loadAsync(conteudo);

  for (const [nomeArquivo, entrada] of Object.entries(zip.files)) {
    if (entrada.dir) continue;
    const destino = path.join(pastaTmp, nomeArquivo);
    await mkdir(path.dirname(destino), { recursive: true });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(destino, await entrada.async('nodebuffer'));
  }
  console.log(`Zip extraído em: ${pastaTmp}`);
  return pastaTmp;
}

async function restaurarSql(client, caminhoSql, rotulo) {
  console.log(`Restaurando ${rotulo}…`);
  const sqlBruto = await readFile(caminhoSql, 'utf8');
  // \restrict / \unrestrict são comandos do psql (proteção contra execução
  // parcial), não SQL — um client de Postgres comum não entende e falha.
  const sql = sqlBruto
    .split('\n')
    .filter((linha) => !linha.startsWith('\\restrict') && !linha.startsWith('\\unrestrict'))
    .join('\n');
  await client.query(sql);
  console.log(`${rotulo} restaurado.`);
}

async function listarArquivosRecursivo(pasta, prefixo = '') {
  const entradas = await readdir(pasta, { withFileTypes: true });
  let arquivos = [];
  for (const entrada of entradas) {
    const caminhoRelativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) {
      arquivos = arquivos.concat(await listarArquivosRecursivo(path.join(pasta, entrada.name), caminhoRelativo));
    } else {
      arquivos.push(caminhoRelativo);
    }
  }
  return arquivos;
}

async function reenviarArquivosStorage(pastaExtraida, supabaseAlvo) {
  const pastaArquivos = path.join(pastaExtraida, 'arquivos');
  let caminhos;
  try {
    caminhos = await listarArquivosRecursivo(pastaArquivos);
  } catch {
    console.log('Nenhuma pasta "arquivos" no backup — nada de Storage pra reenviar.');
    return 0;
  }

  let total = 0;
  for (const caminhoRelativo of caminhos) {
    const [bucket, ...resto] = caminhoRelativo.split('/');
    const caminhoNoBucket = resto.join('/');
    const conteudo = await readFile(path.join(pastaArquivos, caminhoRelativo));
    const { error } = await supabaseAlvo.storage.from(bucket).upload(caminhoNoBucket, conteudo, { upsert: true });
    if (error) {
      console.warn(`Aviso: falha ao reenviar ${caminhoRelativo}: ${error.message}`);
      continue;
    }
    total += 1;
  }
  return total;
}

async function main() {
  const pastaExtraida = await extrairZip(RESTORE_ZIP);

  const client = new Client({ connectionString: RESTORE_DB_URL });
  await client.connect();

  try {
    await restaurarSql(client, path.join(pastaExtraida, 'banco-auth.sql'), 'auth (usuários)');
    await restaurarSql(client, path.join(pastaExtraida, 'banco-storage.sql'), 'storage (metadados dos arquivos)');
    await restaurarSql(client, path.join(pastaExtraida, 'banco-public.sql'), 'public (tabelas do Contferr)');
  } finally {
    await client.end();
  }

  console.log('Reenviando arquivos do Storage…');
  const supabaseAlvo = createClient(RESTORE_SUPABASE_URL, RESTORE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const totalArquivos = await reenviarArquivosStorage(pastaExtraida, supabaseAlvo);
  console.log(`${totalArquivos} arquivo(s) de Storage reenviado(s).`);

  console.log('\nRestauração concluída.');
}

main().catch((erro) => {
  console.error('ERRO NA RESTAURAÇÃO:', erro);
  process.exit(1);
});
