-- Controle de Parcelamentos — ferramenta opcional por departamento, mesmo
-- padrão de usa_processos/usa_alvaras. Nasceu de pedidos de 3 departamentos
-- (Lucro Real/Presumido, DP, Simples) com o mesmo formato de fundo: um
-- acordo de parcelamento (RFB/PGFN/Estado/Município/portal de cada órgão)
-- que gera, mês a mês, uma guia pra conferir se foi enviada e paga. Cada
-- departamento varia no órgão/portal e na quantidade de parcelas — por isso
-- fica com campos livres, não um tipo fixo no código.
alter table public.departamentos
  add column usa_parcelamentos boolean not null default false;

create type public.parcelamento_situacao as enum ('ativo', 'quitado', 'perdido', 'cancelado');

-- Nível 1: o acordo em si, cadastrado uma vez, dura vários meses.
create table public.parcelamentos (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  -- Texto livre (RFB, PGFN, Estado, Município, ou o nome do portal — ex.:
  -- Regularize, Receita, Receita-FGTS, FGTS Digital) — cada departamento usa
  -- sua própria nomenclatura, sugestões vêm do que já foi digitado antes.
  origem text not null,
  numero_parcelamento text,
  data_inicio date not null default current_date,
  quantidade_parcelas integer not null check (quantidade_parcelas > 0),
  -- Parcelamento pode já estar em andamento quando cadastrado no sistema
  -- (ex.: cliente já na parcela 10/60) — a próxima guia gerada continua daqui.
  parcela_inicial integer not null default 1 check (parcela_inicial >= 1),
  -- Regra "perde a negociação após N meses sem pagar" (caso do Simples) —
  -- deliberadamente por parcelamento, não fixa nem global: outros
  -- departamentos não pediram isso e o valor de N varia por órgão/tipo.
  -- null = sem essa regra automática.
  meses_tolerancia_inadimplencia integer check (
    meses_tolerancia_inadimplencia is null or meses_tolerancia_inadimplencia > 0
  ),
  situacao public.parcelamento_situacao not null default 'ativo',
  responsavel_id uuid references public.profiles (id) on delete set null,
  observacoes text,
  criado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parcelamentos_parcela_inicial_lte_quantidade_check check (
    parcela_inicial <= quantidade_parcelas
  )
);
create index parcelamentos_departamento_id_idx on public.parcelamentos (departamento_id);
create index parcelamentos_cliente_id_idx on public.parcelamentos (cliente_id);
create index parcelamentos_responsavel_id_idx on public.parcelamentos (responsavel_id);

-- Nível 2: uma linha por competência, gerada automaticamente (virada mensal
-- — ver próxima migration) pra cada parcelamento ativo. Sem controle de
-- valor, conforme pedido explícito do Lucro Real/Presumido.
create table public.parcelamento_parcelas (
  id uuid primary key default gen_random_uuid(),
  parcelamento_id uuid not null references public.parcelamentos (id) on delete cascade,
  competencia date not null,
  numero_parcela integer not null,
  guia_enviada boolean not null default false,
  pago boolean not null default false,
  data_envio date,
  data_pagamento date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parcelamento_id, competencia)
);
create index parcelamento_parcelas_parcelamento_id_idx on public.parcelamento_parcelas (parcelamento_id);
create index parcelamento_parcelas_competencia_idx on public.parcelamento_parcelas (competencia);

alter table public.parcelamentos enable row level security;
alter table public.parcelamento_parcelas enable row level security;

create policy "Users can view parcelamentos of accessible departamentos" on public.parcelamentos
  for select using (public.pode_acessar_departamento(departamento_id));
create policy "Users can create parcelamentos in accessible departamentos" on public.parcelamentos
  for insert with check (public.pode_acessar_departamento(departamento_id));
create policy "Users can update parcelamentos of accessible departamentos" on public.parcelamentos
  for update using (public.pode_acessar_departamento(departamento_id))
  with check (public.pode_acessar_departamento(departamento_id));
create policy "Users can delete parcelamentos of accessible departamentos" on public.parcelamentos
  for delete using (public.pode_acessar_departamento(departamento_id));

-- parcelamento_parcelas: sem regra de negócio pra travar (ao contrário das
-- etapas de Processos) — marcar "guia enviada"/"pago" é uma ação simples de
-- checklist, então update fica liberado via RLS normal, sem RPC dedicada.
create policy "Users can view parcelamento_parcelas of accessible parcelamentos"
  on public.parcelamento_parcelas for select using (exists (
    select 1 from public.parcelamentos p
    where p.id = parcelamento_parcelas.parcelamento_id
      and public.pode_acessar_departamento(p.departamento_id)
  ));
create policy "Users can create parcelamento_parcelas of accessible parcelamentos"
  on public.parcelamento_parcelas for insert with check (exists (
    select 1 from public.parcelamentos p
    where p.id = parcelamento_parcelas.parcelamento_id
      and public.pode_acessar_departamento(p.departamento_id)
  ));
create policy "Users can update parcelamento_parcelas of accessible parcelamentos"
  on public.parcelamento_parcelas for update using (exists (
    select 1 from public.parcelamentos p
    where p.id = parcelamento_parcelas.parcelamento_id
      and public.pode_acessar_departamento(p.departamento_id)
  )) with check (exists (
    select 1 from public.parcelamentos p
    where p.id = parcelamento_parcelas.parcelamento_id
      and public.pode_acessar_departamento(p.departamento_id)
  ));

grant select, insert, update, delete on public.parcelamentos to authenticated;
grant select, insert, update on public.parcelamento_parcelas to authenticated;
grant all on public.parcelamentos, public.parcelamento_parcelas to service_role;
