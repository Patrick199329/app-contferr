-- Funcionários por cliente (Módulo DP): a planilha real do DP mostra que
-- cada linha é, na verdade, um funcionário do cliente (nome, CPF, senha
-- gov, código de acesso, senha) — dado estável que não devia precisar ser
-- redigitado todo mês, igual já resolvemos pro Responsável. Um cliente pode
-- ter mais de um funcionário.

-- Departamento passa a poder ligar "usa_funcionarios" (mesmo padrão de
-- usa_quadro_tarefas): quando ligado, a Tabela de Tarefas ganha 1 linha por
-- funcionário ativo do cliente, em vez de 1 linha por cliente. Vem antes da
-- tabela funcionarios porque a policy dela referencia esta coluna.
alter table public.departamentos add column usa_funcionarios boolean not null default false;

create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome text not null,
  cpf text,
  senha_gov text,
  codigo_acesso text,
  senha text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.funcionarios enable row level security;

-- Diferente do cadastro geral de clientes (aberto a todo autenticado): os
-- dados do funcionário incluem credenciais (senha gov, código de acesso,
-- senha) — só quem acessa um departamento marcado "usa_funcionarios" ao
-- qual o cliente esteja vinculado pode ver ou editar. Reaproveita
-- pode_acessar_departamento(), já usada pelo Quadro de Tarefas
-- (20260823140000_add_quadro_tarefas.sql).
create policy "Users can view funcionarios of accessible departamentos"
  on public.funcionarios for select
  using (
    exists (
      select 1
      from public.cliente_departamentos cd
      join public.departamentos d on d.id = cd.departamento_id
      where cd.cliente_id = funcionarios.cliente_id
        and d.usa_funcionarios
        and public.pode_acessar_departamento(d.id)
    )
  );

create policy "Users can manage funcionarios of accessible departamentos"
  on public.funcionarios for all
  using (
    exists (
      select 1
      from public.cliente_departamentos cd
      join public.departamentos d on d.id = cd.departamento_id
      where cd.cliente_id = funcionarios.cliente_id
        and d.usa_funcionarios
        and public.pode_acessar_departamento(d.id)
    )
  )
  with check (
    exists (
      select 1
      from public.cliente_departamentos cd
      join public.departamentos d on d.id = cd.departamento_id
      where cd.cliente_id = funcionarios.cliente_id
        and d.usa_funcionarios
        and public.pode_acessar_departamento(d.id)
    )
  );

grant select, insert, update, delete on public.funcionarios to authenticated;
grant all on public.funcionarios to service_role;

-- tarefas ganha vínculo opcional com funcionário.
alter table public.tarefas add column funcionario_id uuid references public.funcionarios (id) on delete cascade;

-- A unicidade antiga (1 linha por cliente+departamento+mês) só faz sentido
-- pra departamentos sem funcionário — vira duas parciais: continua valendo
-- quando funcionario_id é null, e passa a ser por FUNCIONÁRIO+departamento
-- +mês quando não é.
alter table public.tarefas drop constraint tarefas_cliente_id_departamento_id_competencia_key;
create unique index tarefas_sem_funcionario_key on public.tarefas (cliente_id, departamento_id, competencia)
  where funcionario_id is null;
create unique index tarefas_com_funcionario_key on public.tarefas (funcionario_id, departamento_id, competencia)
  where funcionario_id is not null;

-- Novo tipo de coluna: só leitura, puxa um campo do funcionário (nome, CPF,
-- senha gov, código de acesso, senha) direto do cadastro.
alter type public.coluna_tipo add value 'campo_funcionario';

-- Qual campo do funcionário essa coluna puxa — texto solto (não usa o enum
-- coluna_tipo), então não esbarra na restrição do Postgres de não poder usar
-- um valor de enum recém-criado na mesma transação em que foi adicionado.
alter table public.colunas add column campo_funcionario_alvo text
  check (campo_funcionario_alvo in ('nome', 'cpf', 'senha_gov', 'codigo_acesso', 'senha'));
