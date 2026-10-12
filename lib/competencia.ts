// Competência corrente no formato usado pela coluna `competencia date` (primeiro dia do mês).
export function currentCompetencia(): string {
  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mes}-01`;
}

export const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  return `${NOMES_MESES[Number(mes) - 1]}/${ano}`;
}

export function shiftCompetencia(competencia: string, deltaMeses: number): string {
  const [ano, mes] = competencia.split('-').map(Number);
  const date = new Date(Date.UTC(ano, mes - 1 + deltaMeses, 1));
  const novoMes = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${novoMes}-01`;
}
