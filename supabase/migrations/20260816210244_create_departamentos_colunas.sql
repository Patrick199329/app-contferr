-- Módulo 2: Departamentos e Colunas Configuráveis.

create table public.departamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem integer not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.coluna_tipo as enum ('texto', 'lista_opcoes', 'data', 'status', 'responsavel');

create table public.colunas (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  nome text not null,
  tipo public.coluna_tipo not null,
  ordem integer not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Opções de dropdown, reutilizada pelos tipos "lista_opcoes" e "status"
-- (status também é, na prática, uma lista de opções configurável por departamento).
create table public.opcoes_coluna (
  id uuid primary key default gen_random_uuid(),
  coluna_id uuid not null references public.colunas (id) on delete cascade,
  valor text not null,
  ordem integer not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

alter table public.departamentos enable row level security;
alter table public.colunas enable row level security;
alter table public.opcoes_coluna enable row level security;

-- Leitura liberada para qualquer autenticado por ora — a restrição por
-- departamento do Módulo 5 chega na Fase 3.2 e vai substituir esta policy.
create policy "Authenticated users can view departamentos"
  on public.departamentos for select
  to authenticated
  using (true);

create policy "Authenticated users can view colunas"
  on public.colunas for select
  to authenticated
  using (true);

create policy "Authenticated users can view opcoes_coluna"
  on public.opcoes_coluna for select
  to authenticated
  using (true);

create policy "Admins can manage departamentos"
  on public.departamentos for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage colunas"
  on public.colunas for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage opcoes_coluna"
  on public.opcoes_coluna for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.departamentos to authenticated;
grant select, insert, update, delete on public.colunas to authenticated;
grant select, insert, update, delete on public.opcoes_coluna to authenticated;
grant all on public.departamentos to service_role;
grant all on public.colunas to service_role;
grant all on public.opcoes_coluna to service_role;
