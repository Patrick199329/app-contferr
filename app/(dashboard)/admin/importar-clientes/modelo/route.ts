import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/profile';

// Cabeçalhos exatos que app/(dashboard)/admin/importar-clientes/actions.ts
// espera encontrar — casamento é por nome de coluna, não por posição.
const CABECALHOS = [
  'Código',
  'Nome',
  'CNPJ / CPF',
  'Inscrição Estadual',
  'Telefone',
  'Endereço',
  'Complemento',
  'Bairro',
  'Cidade',
  'UF',
  'CEP',
  'Tipo Cálc. IR',
  'Departamento/Subdepartamento (importação)',
];

export async function GET() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet('Clientes');
  planilha.addRow(CABECALHOS);
  planilha.getRow(1).font = { bold: true };
  planilha.columns = CABECALHOS.map((titulo) => ({ header: titulo, width: Math.max(titulo.length, 20) }));

  // Linha de exemplo — mostra o formato esperado da coluna de departamento
  // (mesma sintaxe usada pra carga real do Alterdata).
  planilha.addRow([
    '00001',
    'Empresa Exemplo LTDA',
    '00000000000191',
    'ISENTO',
    '31999999999',
    'Rua Exemplo, 123',
    'Sala 1',
    'Centro',
    'Belo Horizonte',
    'MG',
    '30000000',
    'Simples',
    'Simples Nacional > Simples',
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao-clientes.xlsx"',
    },
  });
}
