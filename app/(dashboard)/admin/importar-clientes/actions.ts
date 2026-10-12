'use server';

import { revalidatePath } from 'next/cache';
import ExcelJS from 'exceljs';
import { isValidDocumento, onlyDigits } from '@/lib/cnpj';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { removerTabelasNativas } from '@/lib/xlsx-sanitize';

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }
}

// Mesmo nome de coluna usado na planilha de referência (Alterdata) e no
// modelo pra download — ver rota /admin/importar-clientes/modelo.
const COLUNA_DEPARTAMENTO = 'Departamento/Subdepartamento (importação)';

export type RegistroValidoImportacao = {
  linha: number;
  codigo: string | null;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string | null;
  tipoCalculoIr: string | null;
  telefone: string | null;
  cep: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  departamentoIds: string[];
  departamentosNaoEncontrados: string[];
};

export type RegistroRejeitadoImportacao = {
  linha: number;
  codigo: string | null;
  nome: string | null;
  motivo: string;
};

export type PreviewImportacao = {
  validos: RegistroValidoImportacao[];
  rejeitados: RegistroRejeitadoImportacao[];
};

// Lê o valor de uma célula como texto simples, cobrindo os formatos que o
// ExcelJS pode devolver (texto puro, número, rich text, resultado de fórmula).
function celula(row: ExcelJS.Row, indicePorHeader: Map<string, number>, header: string): string {
  const idx = indicePorHeader.get(header);
  if (!idx) return '';
  const valor = row.getCell(idx).value;
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    const obj = valor as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(obj.richText)) return obj.richText.map((p) => p.text).join('').trim();
    if ('result' in obj) return String(obj.result ?? '').trim();
    if ('text' in obj) return String(obj.text ?? '').trim();
    return '';
  }
  return String(valor).trim();
}

function opcional(valor: string): string | null {
  return valor.trim() || null;
}

// Só lê e valida o arquivo — não grava nada no banco. `confirmarImportacao`
// recebe exatamente o resultado `validos` daqui, sem reprocessar o arquivo.
export async function preverImportacao(formData: FormData): Promise<PreviewImportacao> {
  await requireAdmin();

  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File)) {
    throw new Error('Nenhum arquivo enviado.');
  }

  const bufferOriginal = Buffer.from(await arquivo.arrayBuffer());
  const buffer = await removerTabelasNativas(bufferOriginal);
  const workbook = new ExcelJS.Workbook();
  // Cast necessário: o .d.ts do exceljs referencia um tipo `Buffer` mais
  // antigo (sem os campos novos como `resizable`) do que o @types/node atual
  // — incompatibilidade só de tipagem, o valor em si é um Buffer normal.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentário acima
  await workbook.xlsx.load(buffer as any);
  const planilha = workbook.worksheets[0];
  if (!planilha) {
    throw new Error('A planilha está vazia.');
  }

  const headerRow = planilha.getRow(1);
  const indicePorHeader = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const nome = String(cell.value ?? '').trim();
    if (nome) indicePorHeader.set(nome, colNumber);
  });

  const supabase = await createClient();
  const [{ data: departamentos }, { data: clientesExistentes }] = await Promise.all([
    supabase.from('departamentos').select('id, nome').eq('status', 'ativo'),
    supabase.from('clientes').select('cnpj'),
  ]);

  const idPorNomeDepartamento = new Map(
    (departamentos ?? []).map((d) => [d.nome.trim().toLowerCase(), d.id]),
  );
  const documentosExistentes = new Set((clientesExistentes ?? []).map((c) => c.cnpj));

  const validos: RegistroValidoImportacao[] = [];
  const rejeitados: RegistroRejeitadoImportacao[] = [];
  // Duplicidade é decidida só pelo documento (CNPJ/CPF) — nunca pelo nome.
  // Duas linhas com o mesmo Nome mas Código e documento diferentes são
  // clientes distintos de verdade (ex.: a mesma pessoa como PF e como PJ) e
  // entram os dois normalmente.
  const vistosNoArquivo = new Map<string, { linha: number; codigo: string | null }>();

  for (let linha = 2; linha <= planilha.rowCount; linha++) {
    const row = planilha.getRow(linha);

    const codigo = opcional(celula(row, indicePorHeader, 'Código'));
    const nome = opcional(celula(row, indicePorHeader, 'Nome'));
    if (!nome) continue; // linha em branco no meio/fim da planilha

    const documento = onlyDigits(celula(row, indicePorHeader, 'CNPJ / CPF'));

    if (!documento) {
      rejeitados.push({ linha, codigo, nome, motivo: 'Sem CNPJ/CPF.' });
      continue;
    }
    if (!isValidDocumento(documento)) {
      rejeitados.push({ linha, codigo, nome, motivo: 'CNPJ/CPF com formato inválido.' });
      continue;
    }
    const jaVisto = vistosNoArquivo.get(documento);
    if (jaVisto) {
      rejeitados.push({
        linha,
        codigo,
        nome,
        motivo: `CNPJ/CPF duplicado nesta planilha (mesmo documento da linha ${jaVisto.linha}, código ${jaVisto.codigo ?? '—'}).`,
      });
      continue;
    }
    if (documentosExistentes.has(documento)) {
      rejeitados.push({ linha, codigo, nome, motivo: 'CNPJ/CPF já cadastrado no sistema.' });
      continue;
    }
    vistosNoArquivo.set(documento, { linha, codigo });

    // "Departamento > Subdepartamento" (ou só "Departamento" pra um sem
    // filhos) separados por "; " quando o cliente pertence a mais de um.
    // Resolve sempre pelo nome mais específico (depois do "> ", se tiver).
    const departamentoIds: string[] = [];
    const departamentosNaoEncontrados: string[] = [];
    const departamentoTexto = celula(row, indicePorHeader, COLUNA_DEPARTAMENTO);
    if (departamentoTexto) {
      for (const parte of departamentoTexto.split(';')) {
        const trecho = parte.trim();
        if (!trecho) continue;
        const nomeAlvo = trecho.includes('>') ? (trecho.split('>').pop() ?? '').trim() : trecho;
        const id = idPorNomeDepartamento.get(nomeAlvo.toLowerCase());
        if (id) departamentoIds.push(id);
        else departamentosNaoEncontrados.push(nomeAlvo);
      }
    }

    validos.push({
      linha,
      codigo,
      razaoSocial: nome,
      nomeFantasia: nome,
      cnpj: documento,
      inscricaoEstadual: opcional(celula(row, indicePorHeader, 'Inscrição Estadual')),
      tipoCalculoIr: opcional(celula(row, indicePorHeader, 'Tipo Cálc. IR')),
      telefone: opcional(celula(row, indicePorHeader, 'Telefone')),
      cep: opcional(celula(row, indicePorHeader, 'CEP')),
      endereco: opcional(celula(row, indicePorHeader, 'Endereço')),
      complemento: opcional(celula(row, indicePorHeader, 'Complemento')),
      bairro: opcional(celula(row, indicePorHeader, 'Bairro')),
      cidade: opcional(celula(row, indicePorHeader, 'Cidade')),
      uf: opcional(celula(row, indicePorHeader, 'UF')),
      departamentoIds,
      departamentosNaoEncontrados,
    });
  }

  return { validos, rejeitados };
}

export type ResultadoConfirmacao = {
  importados: number;
  falhas: { codigo: string | null; nome: string; motivo: string }[];
};

// Recebe exatamente os registros já validados no preview — não reabre nem
// reprocessa o arquivo. Insere um a um (não um insert em lote só) pra uma
// linha com problema (ex.: corrida rara de unicidade) não derrubar as
// outras 680.
export async function confirmarImportacao(
  registros: RegistroValidoImportacao[],
): Promise<ResultadoConfirmacao> {
  await requireAdmin();

  const supabase = await createClient();
  let importados = 0;
  const falhas: ResultadoConfirmacao['falhas'] = [];

  for (const r of registros) {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert({
        razao_social: r.razaoSocial,
        nome_fantasia: r.nomeFantasia,
        cnpj: r.cnpj,
        codigo: r.codigo,
        inscricao_estadual: r.inscricaoEstadual,
        tipo_calculo_ir: r.tipoCalculoIr,
        telefone: r.telefone,
        cep: r.cep,
        endereco: r.endereco,
        complemento: r.complemento,
        bairro: r.bairro,
        cidade: r.cidade,
        uf: r.uf,
      })
      .select('id')
      .single();

    if (error || !cliente) {
      falhas.push({
        codigo: r.codigo,
        nome: r.nomeFantasia,
        motivo: error?.message ?? 'Erro desconhecido.',
      });
      continue;
    }

    importados += 1;

    if (r.departamentoIds.length > 0) {
      await supabase.from('cliente_departamentos').insert(
        r.departamentoIds.map((departamentoId) => ({
          cliente_id: cliente.id,
          departamento_id: departamentoId,
        })),
      );
    }
  }

  revalidatePath('/clientes');
  return { importados, falhas };
}
