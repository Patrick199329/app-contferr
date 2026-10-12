-- Campos personalizados por departamento no Quadro de Tarefas — mesma ideia
-- das colunas configuráveis da Tabela de Tarefas (texto/lista_opcoes/data/
-- status/responsavel, reaproveitando o enum public.coluna_tipo), mas sem
-- periodicidade (conceito de competência mensal que não existe aqui: cada
-- linha do Quadro é uma tarefa avulsa, não um cliente×departamento×mês).
--
-- Tabelas dedicadas em vez de reaproveitar colunas/opcoes_coluna: aquelas já
-- são lidas em vários pontos estáveis (Tabela de Tarefas, Histórico, filtro
-- de periodicidade) sem nenhum filtro de escopo — misturar exigiria
-- adicionar esse filtro em todo lugar, com risco de uma coluna do Quadro
-- vazar pra grade fiscal por esquecimento.

create table public.quadro_tarefas_campos (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  nome text not null,
  tipo public.coluna_tipo not null,
  ordem integer not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quadro_tarefas_campos_opcoes (
  id uuid primary key default gen_random_uuid(),
  campo_id uuid not null references public.quadro_tarefas_campos (id) on delete cascade,
  valor text not null,
  ordem integer not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

alter table public.quadro_tarefas add column valores jsonb not null default '{}'::jsonb;

alter table public.quadro_tarefas_campos enable row level security;
alter table public.quadro_tarefas_campos_opcoes enable row level security;

-- Mesma política de colunas/opcoes_coluna: leitura liberada pra qualquer
-- autenticado (é só estrutura, não dado de cliente), gestão restrita a admin.
create policy "Authenticated users can view quadro_tarefas_campos"
  on public.quadro_tarefas_campos for select
  to authenticated
  using (true);

create policy "Authenticated users can view quadro_tarefas_campos_opcoes"
  on public.quadro_tarefas_campos_opcoes for select
  to authenticated
  using (true);

create policy "Admins can manage quadro_tarefas_campos"
  on public.quadro_tarefas_campos for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage quadro_tarefas_campos_opcoes"
  on public.quadro_tarefas_campos_opcoes for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.quadro_tarefas_campos to authenticated;
grant select, insert, update, delete on public.quadro_tarefas_campos_opcoes to authenticated;
grant all on public.quadro_tarefas_campos to service_role;
grant all on public.quadro_tarefas_campos_opcoes to service_role;
