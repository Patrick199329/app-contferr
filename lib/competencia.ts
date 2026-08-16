// Competência corrente no formato usado pela coluna `competencia date` (primeiro dia do mês).
export function currentCompetencia(): string {
  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mes}-01`;
}

export function formatCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  const nomes = [
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
  return `${nomes[Number(mes) - 1]}/${ano}`;
}
