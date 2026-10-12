-- Correção de modelagem, a pedido do DP: código de acesso, senha e senha
-- gov.br são credenciais do EMPREGADOR (o cliente), não de cada funcionário
-- doméstico — a atividade no portal usa sempre o mesmo login, tenha o
-- empregador 1 ou 10 empregados. Move essas 3 colunas de `funcionarios` pra
-- `clientes`; o funcionário passa a guardar só nome e CPF.
alter table public.clientes
  add column senha_gov text,
  add column codigo_acesso text,
  add column senha text;

-- Carrega pra frente qualquer credencial já cadastrada num funcionário desse
-- cliente antes de remover as colunas — pega a mais antiga preenchida (são
-- iguais entre os funcionários de um mesmo cliente na prática, já que é a
-- mesma credencial do empregador).
update public.clientes c
set senha_gov = f.senha_gov,
    codigo_acesso = f.codigo_acesso,
    senha = f.senha
from (
  select distinct on (cliente_id) cliente_id, senha_gov, codigo_acesso, senha
  from public.funcionarios
  where senha_gov is not null or codigo_acesso is not null or senha is not null
  order by cliente_id, created_at
) f
where f.cliente_id = c.id;

alter table public.funcionarios
  drop column senha_gov,
  drop column codigo_acesso,
  drop column senha;
