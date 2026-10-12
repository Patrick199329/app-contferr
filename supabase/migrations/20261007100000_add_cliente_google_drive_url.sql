-- Link da pasta do cliente no Google Drive — cadastrado uma vez no cliente,
-- usado como atalho (ícone) em toda tela que referencia esse cliente
-- (Tabela de Tarefas, Tarefas Avulsas, Alvarás, Parcelamentos, Processos,
-- ficha e lista de Clientes). Não é uma coluna configurável por
-- departamento — é dado do cadastro, igual telefone/endereço.
alter table public.clientes
  add column google_drive_url text;
