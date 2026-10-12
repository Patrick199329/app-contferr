import {
  Banknote,
  Building2,
  CreditCard,
  ExternalLink,
  FileText,
  Globe,
  Landmark,
  Link as LinkIconLucide,
  Mail,
  Receipt,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

// Conjunto fixo de ícones pra coluna "Link" — escolhido uma vez por coluna
// (ex.: "Portal de emissão da guia" ganha o ícone de recibo, "Link do
// processo" ganha o de documento), e usado pra abrir a URL de cada linha.
export type LinkIconeKey =
  | 'link'
  | 'globe'
  | 'landmark'
  | 'receipt'
  | 'file-text'
  | 'external-link'
  | 'shield-check'
  | 'credit-card'
  | 'building'
  | 'banknote'
  | 'mail';

export const LINK_ICONE_PADRAO: LinkIconeKey = 'link';

export const LINK_ICONES: Record<LinkIconeKey, { label: string; Icon: LucideIcon }> = {
  link: { label: 'Link', Icon: LinkIconLucide },
  globe: { label: 'Site', Icon: Globe },
  landmark: { label: 'Órgão público', Icon: Landmark },
  receipt: { label: 'Guia/Boleto', Icon: Receipt },
  'file-text': { label: 'Documento', Icon: FileText },
  'external-link': { label: 'Link externo', Icon: ExternalLink },
  'shield-check': { label: 'Portal seguro', Icon: ShieldCheck },
  'credit-card': { label: 'Pagamento', Icon: CreditCard },
  building: { label: 'Empresa/Prefeitura', Icon: Building2 },
  banknote: { label: 'Financeiro', Icon: Banknote },
  mail: { label: 'E-mail', Icon: Mail },
};

// Aceita o usuário colar só o domínio (ex.: "receita.fazenda.gov.br") sem
// http(s):// na frente — completa pra abrir certo, sem mudar o texto salvo.
export function normalizarUrl(valor: string): string {
  return /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
}
