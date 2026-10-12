export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function calcCheckDigit(base: string, weights: number[]): number {
  const sum = base.split('').reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const base = digits.slice(0, 12);
  const d1 = calcCheckDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheckDigit(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits === base + String(d1) + String(d2);
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const base = digits.slice(0, 9);
  const d1 = calcCheckDigit(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheckDigit(base + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits === base + String(d1) + String(d2);
}

// Cliente pode ser pessoa jurídica (CNPJ, 14 dígitos) ou pessoa física (CPF,
// 11 dígitos) — ver supabase/migrations/20260912080000_departamentos_alterdata_e_cpf.sql.
// Essas duas funções decidem qual validação/máscara aplicar pela quantidade
// de dígitos, sem o chamador precisar saber de antemão qual é qual.
export function isValidDocumento(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

export function formatDocumento(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 11) return formatCpf(digits);
  return formatCnpj(digits);
}

export class CnpjLookupError extends Error {}

export type CnpjLookupResult = {
  razaoSocial: string;
  nomeFantasia: string;
  telefone: string;
  cep: string;
  endereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  tipoCalculoIr: string;
};

// "SN"/"S/N" é como a Receita representa "sem número" — não faz sentido virar
// ", SN" no fim do endereço.
function montarEndereco(logradouro: unknown, numero: unknown): string {
  const rua = String(logradouro ?? '').trim();
  const num = String(numero ?? '').trim();
  const semNumero = !num || /^s\/?n$/i.test(num);
  return semNumero ? rua : `${rua}, ${num}`;
}

// O regime tributário (Simples/Presumido/Real/MEI) não é declarado junto do
// resto do cadastro, mas a Receita publica o histórico ano a ano em
// `regime_tributario` — usamos o ano mais recente como sugestão. Continua
// editável: é a opção informada à Receita, não necessariamente como a
// contabilidade classifica o cliente internamente.
type RegimeTributario = { ano?: number; forma_de_tributacao?: string };

function inferirTipoCalculoIr(data: Record<string, unknown>): string {
  const regimes: RegimeTributario[] = Array.isArray(data.regime_tributario)
    ? data.regime_tributario
    : [];
  if (regimes.length > 0) {
    const maisRecente = regimes.reduce((a, b) => ((b?.ano ?? 0) > (a?.ano ?? 0) ? b : a));
    if (maisRecente?.forma_de_tributacao) return String(maisRecente.forma_de_tributacao);
  }
  if (data.opcao_pelo_mei) return 'MEI';
  if (data.opcao_pelo_simples) return 'SIMPLES NACIONAL';
  return '';
}

// Consulta a BrasilAPI (gratuita, sem chave, sem SLA formal) — timeout curto e
// erro sempre tratável, para nunca travar o cadastro manual como fallback.
export async function fetchCnpjData(cnpj: string): Promise<CnpjLookupResult> {
  const digits = onlyDigits(cnpj);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: controller.signal,
      // Sem um User-Agent explícito, o Cloudflare na frente da BrasilAPI retorna
      // 403 para o fetch nativo do Node (curl passa por padrão, fetch não).
      headers: {
        'User-Agent': 'Contferr/1.0 (+https://contferr.local)',
        Accept: 'application/json',
      },
    });

    if (res.status === 404) {
      throw new CnpjLookupError('CNPJ não encontrado.');
    }
    if (!res.ok) {
      throw new CnpjLookupError('Não foi possível consultar o CNPJ agora.');
    }

    const data = await res.json();
    return {
      razaoSocial: String(data.razao_social ?? ''),
      nomeFantasia: String(data.nome_fantasia ?? ''),
      telefone: String(data.ddd_telefone_1 || data.ddd_telefone_2 || ''),
      cep: String(data.cep ?? ''),
      endereco: montarEndereco(data.logradouro, data.numero),
      complemento: String(data.complemento ?? ''),
      bairro: String(data.bairro ?? ''),
      cidade: String(data.municipio ?? ''),
      uf: String(data.uf ?? ''),
      tipoCalculoIr: inferirTipoCalculoIr(data),
    };
  } catch (err) {
    if (err instanceof CnpjLookupError) throw err;
    throw new CnpjLookupError('Não foi possível consultar o CNPJ agora.');
  } finally {
    clearTimeout(timeout);
  }
}
