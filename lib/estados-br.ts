// Lista fixa das 27 UFs — usada como <select> no cadastro de cliente pra
// evitar erro de digitação (a BrasilAPI já devolve a sigla certa quando
// preenche sozinho, isso aqui cobre o preenchimento manual).
export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;
