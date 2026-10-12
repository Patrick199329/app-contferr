export type ConfiguracaoMarca = {
  id: true;
  cor_cabecalho: string | null;
  cor_menu_selecionado: string | null;
  cor_cabecalho_tabela: string | null;
  logo_url: string | null;
  logo_login_url: string | null;
  favicon_url: string | null;
  nome_site: string | null;
  updated_by: string | null;
  updated_at: string;
};

export const NOME_SITE_PADRAO = 'Contferr';

export const CONFIGURACAO_MARCA_PADRAO: ConfiguracaoMarca = {
  id: true,
  cor_cabecalho: null,
  cor_menu_selecionado: null,
  cor_cabecalho_tabela: null,
  logo_url: null,
  logo_login_url: null,
  favicon_url: null,
  nome_site: null,
  updated_by: null,
  updated_at: '',
};
