-- Logo separado pra tela de login — às vezes o cliente quer o mesmo logo do
-- cabeçalho, às vezes não (por exemplo, uma versão maior/diferente pra tela
-- cheia de login vs. o ícone compacto do cabeçalho). Opcional: quando vazio,
-- a tela de login cai pro logo_url normal (mesmo comportamento de hoje).
alter table public.configuracoes_marca
  add column logo_login_url text;
