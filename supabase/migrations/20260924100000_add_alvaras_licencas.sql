-- Ferramenta "Alvarás e licenças" — mesmo padrão de usa_processos/usa_quadro_tarefas:
-- flag opcional por departamento + tabela nova isolada por pode_acessar_departamento().
alter table public.departamentos
  add column usa_alvaras boolean not null default false;

create type public.licenca_situacao as enum ('ativa', 'em_renovacao', 'cancelada');
create type public.licenca_recorrencia as enum ('anual', 'manual', 'sem_renovacao');

create table public.licencas (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tipo text not null,
  orgao_emissor text,
  numero text,
  municipio text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  data_emissao date,
  data_vencimento date,
  situacao public.licenca_situacao not null default 'ativa',
  responsavel_id uuid references public.profiles (id) on delete set null,
  -- Configuração da taxa anual (só armazenada aqui; a geração/controle das
  -- taxas anuais em si é um módulo à parte).
  recorrencia public.licenca_recorrencia not null default 'anual',
  taxa_mes smallint check (taxa_mes is null or taxa_mes between 1 and 12),
  taxa_dia smallint check (taxa_dia is null or taxa_dia between 1 and 31),
  valor_estimado numeric(12, 2) check (valor_estimado is null or valor_estimado >= 0),
  observacoes text,
  criado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index licencas_departamento_id_idx on public.licencas (departamento_id);
create index licencas_cliente_id_idx on public.licencas (cliente_id);
create index licencas_data_vencimento_idx on public.licencas (data_vencimento);
create index licencas_responsavel_id_idx on public.licencas (responsavel_id);

alter table public.licencas enable row level security;

create policy "Users can view licencas of accessible departamentos" on public.licencas
  for select using (public.pode_acessar_departamento(departamento_id));
create policy "Users can create licencas in accessible departamentos" on public.licencas
  for insert with check (public.pode_acessar_departamento(departamento_id));
create policy "Users can update licencas of accessible departamentos" on public.licencas
  for update using (public.pode_acessar_departamento(departamento_id))
  with check (public.pode_acessar_departamento(departamento_id));
create policy "Users can delete licencas of accessible departamentos" on public.licencas
  for delete using (public.pode_acessar_departamento(departamento_id));

grant select, insert, update, delete on public.licencas to authenticated;
grant all on public.licencas to service_role;
