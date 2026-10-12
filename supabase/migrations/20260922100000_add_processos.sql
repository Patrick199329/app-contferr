-- Ferramenta "Processos" — mesmo padrão de usa_quadro_tarefas/usa_funcionarios,
-- reaproveitável por qualquer departamento futuro (não só Societário — por
-- isso o flag e as tabelas de processo/etapa têm nome genérico; só a tabela
-- de taxa é explicitamente JUCEMG, que é mesmo uma regra de negócio
-- específica desse domínio).
alter table public.departamentos
  add column usa_processos boolean not null default false;

create type public.processo_status as enum ('ativo', 'concluido', 'cancelado');
create type public.processo_prioridade as enum ('baixa', 'normal', 'alta');
create type public.processo_etapa_status as enum ('pendente', 'em_andamento', 'concluida');
create type public.taxa_jucemg_situacao as enum ('a_gerar', 'gerada', 'paga', 'dispensada');

-- Tipos de serviço (AB/AL/BX/RG...) por departamento — mesma ideia de
-- quadro_tarefas_campos: config aberta a leitura, só admin escreve.
create table public.tipos_processo (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  codigo text not null check (codigo = upper(codigo) and char_length(codigo) between 2 and 4),
  nome text not null,
  cor text not null default '#2563eb' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  ordem integer not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (departamento_id, codigo)
);

-- Etapas-modelo: sequência ordenada de um tipo de serviço. trava_por_taxa_jucemg
-- fica aqui (por etapa), não na tabela pai — requisito confirmado: "varia por
-- tipo/etapa", não é uma etapa fixa única.
create table public.etapas_modelo (
  id uuid primary key default gen_random_uuid(),
  tipo_processo_id uuid not null references public.tipos_processo (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  trava_por_taxa_jucemg boolean not null default false,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index etapas_modelo_tipo_processo_id_idx on public.etapas_modelo (tipo_processo_id);

alter table public.tipos_processo enable row level security;
alter table public.etapas_modelo enable row level security;

create policy "Authenticated users can view tipos_processo" on public.tipos_processo
  for select to authenticated using (true);
create policy "Authenticated users can view etapas_modelo" on public.etapas_modelo
  for select to authenticated using (true);
create policy "Admins can manage tipos_processo" on public.tipos_processo
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage etapas_modelo" on public.etapas_modelo
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.tipos_processo, public.etapas_modelo to authenticated;
grant all on public.tipos_processo, public.etapas_modelo to service_role;
