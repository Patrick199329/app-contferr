-- Cor do cabeçalho das tabelas (Tabela de Tarefas, Histórico etc.) — mesmo
-- padrão de cor_cabecalho/cor_menu_selecionado: null usa o padrão do
-- sistema (fundo escuro, letra clara), preenchido deixa o admin escolher.
alter table public.configuracoes_marca
  add column cor_cabecalho_tabela text;

comment on column public.configuracoes_marca.cor_cabecalho_tabela is 'Cor de fundo do cabeçalho das tabelas (th) — texto contrasta automaticamente, igual cor_cabecalho/cor_menu_selecionado. Null = padrão escuro do sistema.';
