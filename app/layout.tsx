import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { corContrastante } from '@/lib/color-contraste';
import { getConfiguracaoMarca } from '@/lib/supabase/branding';
import { NOME_SITE_PADRAO } from '@/types/branding';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfiguracaoMarca();
  const nomeSite = config.nome_site || NOME_SITE_PADRAO;
  return {
    title: nomeSite,
    description: `Gestão de tarefas e clientes da ${nomeSite}.`,
    icons: { icon: config.favicon_url || '/favicon.ico' },
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const config = await getConfiguracaoMarca();

  // Sobrescreve as CSS custom properties só quando o admin personalizou algo
  // em Painel Administrativo > Aparência — sem configuração, o :root de
  // globals.css continua valendo do jeito que já era.
  const brandStyle: Record<string, string> = {};
  if (config.cor_cabecalho) {
    brandStyle['--header-bg'] = config.cor_cabecalho;
    brandStyle['--header-foreground'] = corContrastante(config.cor_cabecalho);
  }
  if (config.cor_menu_selecionado) {
    brandStyle['--accent'] = config.cor_menu_selecionado;
    brandStyle['--accent-foreground'] = corContrastante(config.cor_menu_selecionado);
  }
  if (config.cor_cabecalho_tabela) {
    brandStyle['--table-header-bg'] = config.cor_cabecalho_tabela;
    brandStyle['--table-header-foreground'] = corContrastante(config.cor_cabecalho_tabela);
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={brandStyle as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
