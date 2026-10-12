-- Amplia o cadastro de cliente com os campos que aparecem na planilha do
-- cliente (carga inicial) e que, na maioria, dá pra preencher sozinho via
-- consulta de CNPJ (ver lib/cnpj.ts). Todos opcionais — nenhum quebra
-- clientes já cadastrados.
alter table public.clientes
  add column codigo text,
  add column inscricao_estadual text,
  add column tipo_calculo_ir text,
  add column telefone text,
  add column cep text,
  add column endereco text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column uf text;

comment on column public.clientes.codigo is 'Código/identificador do cliente no sistema anterior do escritório — só referência, não vem de nenhuma API.';
comment on column public.clientes.inscricao_estadual is 'Registro estadual (SEFAZ) — não consta na Receita Federal/BrasilAPI, sempre manual.';
comment on column public.clientes.tipo_calculo_ir is 'Regime tributário (Simples Nacional/Lucro Presumido/Lucro Real/MEI) — sugerido pela consulta de CNPJ quando disponível, mas sempre editável.';
