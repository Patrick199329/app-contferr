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

export class CnpjLookupError extends Error {}

export type CnpjLookupResult = {
  razaoSocial: string;
  nomeFantasia: string;
};

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
    };
  } catch (err) {
    if (err instanceof CnpjLookupError) throw err;
    throw new CnpjLookupError('Não foi possível consultar o CNPJ agora.');
  } finally {
    clearTimeout(timeout);
  }
}
