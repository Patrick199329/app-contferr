import JSZip from 'jszip';

// O ExcelJS quebra (TypeError: Cannot read properties of undefined (reading
// 'name')) ao ler um .xlsx que tem uma Tabela nativa do Excel (Inserir >
// Tabela) cujo intervalo declarado (`ref`) não bate mais com as colunas
// reais da planilha — por exemplo, depois de adicionar uma coluna nova pelo
// openpyxl, que não sabe atualizar essa metadata. Como a importação só lê
// nomes de coluna e valores de célula, nunca formatação de Tabela, a
// correção mais robusta é remover essa metadata do arquivo antes de
// entregar pro ExcelJS — funciona pra qualquer planilha nessa situação, não
// só pra este arquivo específico.
export async function removerTabelasNativas(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);

  const nomesTabela = Object.keys(zip.files).filter((nome) => /^xl\/tables\/.*\.xml$/.test(nome));
  if (nomesTabela.length === 0) return buffer; // nada pra fazer

  for (const nome of nomesTabela) {
    zip.remove(nome);
  }

  const nomesSheet = Object.keys(zip.files).filter((nome) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(nome),
  );
  for (const nome of nomesSheet) {
    const conteudo = await zip.files[nome].async('string');
    const semTableParts = conteudo.replace(/<tableParts[\s\S]*?<\/tableParts>|<tableParts[^/]*\/>/g, '');
    if (semTableParts !== conteudo) {
      zip.file(nome, semTableParts);
    }
  }

  const nomesRels = Object.keys(zip.files).filter((nome) =>
    /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(nome),
  );
  for (const nome of nomesRels) {
    const conteudo = await zip.files[nome].async('string');
    const semRelTabela = conteudo.replace(
      /<Relationship[^>]*Type="[^"]*\/relationships\/table"[^>]*\/>/g,
      '',
    );
    if (semRelTabela !== conteudo) {
      zip.file(nome, semRelTabela);
    }
  }

  const contentTypesPath = '[Content_Types].xml';
  if (zip.files[contentTypesPath]) {
    const conteudo = await zip.files[contentTypesPath].async('string');
    const semOverrideTabela = conteudo.replace(
      /<Override PartName="\/xl\/tables\/[^"]*"[^>]*\/>/g,
      '',
    );
    if (semOverrideTabela !== conteudo) {
      zip.file(contentTypesPath, semOverrideTabela);
    }
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}
