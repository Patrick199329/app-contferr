-- Nome do site exibido na aba do navegador (título da página) — editável
-- em Painel Administrativo > Aparência, mesma lógica das demais
-- personalizações de marca. Null = mantém "Contferr" como padrão.
alter table public.configuracoes_marca
  add column nome_site text;
