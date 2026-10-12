create table public.processos (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  tipo_processo_id uuid not null references public.tipos_processo (id) on delete restrict,
  cliente_id uuid references public.clientes (id) on delete set null,
  -- Empresa sem CNPJ/cadastro ainda (ex.: Abertura de empresa antes de
  -- existir) — clientes.cnpj é not null unique, não dá pra virar uma linha
  -- de clientes ainda. Exatamente um dos dois preenchido, nunca os dois,
  -- nunca nenhum.
  cliente_nome_avulso text,
  titulo text not null,
  prioridade public.processo_prioridade not null default 'normal',
  responsavel_id uuid references public.profiles (id) on delete set null,
  criado_por uuid not null references public.profiles (id),
  data_abertura date not null default current_date,
  prazo_final date,
  protocolo_geral text,
  observacoes text,
  status public.processo_status not null default 'ativo',
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint processos_cliente_xor check (
    (cliente_id is not null)::int + (cliente_nome_avulso is not null)::int = 1
  )
);
create index processos_departamento_id_idx on public.processos (departamento_id);
create index processos_cliente_id_idx on public.processos (cliente_id);
create index processos_responsavel_id_idx on public.processos (responsavel_id);
create index processos_tipo_processo_id_idx on public.processos (tipo_processo_id);

-- Cópia por-processo das etapas do tipo, no momento da criação — desacoplada
-- do template depois (nome/ordem/trava copiados, não lidos ao vivo). Renomear
-- uma etapa-modelo depois não deve alterar processos já abertos; apagar uma
-- etapa-modelo não pode apagar histórico (etapa_modelo_id: on delete set null).
create table public.processo_etapas (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos (id) on delete cascade,
  etapa_modelo_id uuid references public.etapas_modelo (id) on delete set null,
  nome text not null,
  ordem integer not null,
  trava_por_taxa_jucemg boolean not null default false,
  status public.processo_etapa_status not null default 'pendente',
  prazo date,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (processo_id, ordem)
);
create index processo_etapas_processo_id_idx on public.processo_etapas (processo_id);

-- 1:1 com processo_etapas.id (não com processos.id): o bloqueio varia por
-- etapa, não é uma propriedade do processo como um todo (requisito
-- confirmado). Isso também deixa a tela "Taxas JUCEMG" trivial (1 linha =
-- 1 taxa, já com a etapa alvo via join) e suporta, sem mudar o modelo, um
-- tipo de serviço com mais de uma etapa travada por taxa no futuro.
create table public.processo_taxas_jucemg (
  id uuid primary key default gen_random_uuid(),
  processo_etapa_id uuid not null unique references public.processo_etapas (id) on delete cascade,
  situacao public.taxa_jucemg_situacao not null default 'a_gerar',
  numero_guia text,
  valor numeric(12, 2),
  vencimento date,
  data_pagamento date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.processo_eventos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos (id) on delete cascade,
  descricao text not null,
  criado_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index processo_eventos_processo_id_idx on public.processo_eventos (processo_id);

alter table public.processos enable row level security;
alter table public.processo_etapas enable row level security;
alter table public.processo_taxas_jucemg enable row level security;
alter table public.processo_eventos enable row level security;

-- processos: mesma isolação por departamento do Quadro de Tarefas.
create policy "Users can view processos of accessible departamentos" on public.processos
  for select using (public.pode_acessar_departamento(departamento_id));
create policy "Users can create processos in accessible departamentos" on public.processos
  for insert with check (public.pode_acessar_departamento(departamento_id));
create policy "Users can update processos of accessible departamentos" on public.processos
  for update using (public.pode_acessar_departamento(departamento_id))
  with check (public.pode_acessar_departamento(departamento_id));
create policy "Admins can delete processos" on public.processos
  for delete using (public.is_admin());

-- processo_etapas: SELECT + INSERT abertos a quem acessa o departamento do
-- processo (join via processo_id). SEM policy de UPDATE genérica — o status
-- só muda pela RPC atualizar_status_processo_etapa (migration seguinte), que
-- roda security definer justamente pra ser o ÚNICO caminho de escrita e não
-- deixar a regra "trava por taxa" contornável por um .update() direto do
-- cliente.
create policy "Users can view processo_etapas of accessible processos" on public.processo_etapas
  for select using (exists (
    select 1 from public.processos p
    where p.id = processo_etapas.processo_id and public.pode_acessar_departamento(p.departamento_id)
  ));
create policy "Users can create processo_etapas of accessible processos" on public.processo_etapas
  for insert with check (exists (
    select 1 from public.processos p
    where p.id = processo_etapas.processo_id and public.pode_acessar_departamento(p.departamento_id)
  ));

create policy "Users can view processo_taxas_jucemg of accessible processos" on public.processo_taxas_jucemg
  for select using (exists (
    select 1 from public.processo_etapas pe join public.processos p on p.id = pe.processo_id
    where pe.id = processo_taxas_jucemg.processo_etapa_id and public.pode_acessar_departamento(p.departamento_id)
  ));
create policy "Users can create processo_taxas_jucemg of accessible processos" on public.processo_taxas_jucemg
  for insert with check (exists (
    select 1 from public.processo_etapas pe join public.processos p on p.id = pe.processo_id
    where pe.id = processo_taxas_jucemg.processo_etapa_id and public.pode_acessar_departamento(p.departamento_id)
  ));
create policy "Users can update processo_taxas_jucemg of accessible processos" on public.processo_taxas_jucemg
  for update using (exists (
    select 1 from public.processo_etapas pe join public.processos p on p.id = pe.processo_id
    where pe.id = processo_taxas_jucemg.processo_etapa_id and public.pode_acessar_departamento(p.departamento_id)
  )) with check (exists (
    select 1 from public.processo_etapas pe join public.processos p on p.id = pe.processo_id
    where pe.id = processo_taxas_jucemg.processo_etapa_id and public.pode_acessar_departamento(p.departamento_id)
  ));

create policy "Users can view processo_eventos of accessible processos" on public.processo_eventos
  for select using (exists (
    select 1 from public.processos p where p.id = processo_eventos.processo_id and public.pode_acessar_departamento(p.departamento_id)
  ));
create policy "Users can create processo_eventos of accessible processos" on public.processo_eventos
  for insert with check (exists (
    select 1 from public.processos p where p.id = processo_eventos.processo_id and public.pode_acessar_departamento(p.departamento_id)
  ));

grant select, insert, update, delete on public.processos to authenticated;
grant select, insert on public.processo_etapas to authenticated;
grant select, insert, update on public.processo_taxas_jucemg to authenticated;
grant select, insert on public.processo_eventos to authenticated;
grant all on public.processos, public.processo_etapas, public.processo_taxas_jucemg, public.processo_eventos to service_role;
