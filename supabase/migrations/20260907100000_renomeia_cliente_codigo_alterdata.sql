-- O campo "Código" (adicionado na ampliação de cadastro) é, na prática, o
-- código do cliente no Alterdata (sistema anterior do escritório) — só
-- atualiza o comentário da coluna pra refletir isso; nenhuma mudança de
-- estrutura ou de dado.
comment on column public.clientes.codigo is 'Código do cliente no Alterdata (sistema anterior do escritório) — só referência, não vem de nenhuma API.';
