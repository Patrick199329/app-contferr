-- Quadro de Tarefas (Fase 2): recorrência. Mesmo padrão da Virada Mensal
-- (função SECURITY DEFINER agendada via pg_cron + tabela de log + botão de
-- forçar manual no painel admin), rodando diariamente em vez de mensalmente
-- porque cada tarefa pode ser diária, semanal ou mensal.

create type public.recorrencia_frequencia as enum ('diaria', 'semanal', 'mensal');

create table public.quadro_tarefas_recorrencias (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete set null,
  titulo text not null,
  descricao text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  criado_por uuid not null references public.profiles (id),
  frequencia public.recorrencia_frequencia not null,
  intervalo integer not null default 1 check (intervalo > 0),
  proxima_data date not null,
  data_fim date,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quadro_tarefas
  add column recorrencia_id uuid references public.quadro_tarefas_recorrencias (id) on delete set null;

create index quadro_tarefas_recorrencias_departamento_id_idx
  on public.quadro_tarefas_recorrencias (departamento_id);
create index quadro_tarefas_recorrencia_id_idx on public.quadro_tarefas (recorrencia_id);

alter table public.quadro_tarefas_recorrencias enable row level security;

create policy "Users can view quadro_tarefas_recorrencias of accessible departamentos"
  on public.quadro_tarefas_recorrencias for select
  using (public.pode_acessar_departamento(departamento_id));

create policy "Users can create quadro_tarefas_recorrencias in accessible departamentos"
  on public.quadro_tarefas_recorrencias for insert
  with check (public.pode_acessar_departamento(departamento_id));

create policy "Users can update quadro_tarefas_recorrencias of accessible departamentos"
  on public.quadro_tarefas_recorrencias for update
  using (public.pode_acessar_departamento(departamento_id))
  with check (public.pode_acessar_departamento(departamento_id));

grant select, insert, update on public.quadro_tarefas_recorrencias to authenticated;
grant all on public.quadro_tarefas_recorrencias to service_role;

create table public.quadro_tarefas_recorrencia_log (
  id uuid primary key default gen_random_uuid(),
  executado_em timestamptz not null default now(),
  status text not null check (status in ('sucesso', 'erro')),
  tarefas_criadas integer,
  mensagem text,
  executado_por uuid references public.profiles (id)
);

alter table public.quadro_tarefas_recorrencia_log enable row level security;

create policy "Admins can view quadro_tarefas_recorrencia_log"
  on public.quadro_tarefas_recorrencia_log for select
  using (public.is_admin());

grant select on public.quadro_tarefas_recorrencia_log to authenticated;
grant all on public.quadro_tarefas_recorrencia_log to service_role;

-- Se o cron ficar fora do ar por vários dias, cada recorrência atrasada gera
-- só UMA tarefa por execução do job (não um backlog de uma vez só) — em
-- alguns dias consecutivos ela se recupera sozinha, sem inundar o quadro com
-- tarefas atrasadas duplicadas.
create or replace function public.gerar_tarefas_recorrentes(p_executado_por uuid default null)
returns public.quadro_tarefas_recorrencia_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := current_date;
  v_criadas integer := 0;
  v_log public.quadro_tarefas_recorrencia_log;
  r record;
begin
  for r in
    select * from public.quadro_tarefas_recorrencias
    where ativa
      and proxima_data <= v_hoje
      and (data_fim is null or proxima_data <= data_fim)
  loop
    insert into public.quadro_tarefas
      (departamento_id, cliente_id, titulo, descricao, responsavel_id, criado_por, prazo, recorrencia_id)
    values
      (r.departamento_id, r.cliente_id, r.titulo, r.descricao, r.responsavel_id, r.criado_por, r.proxima_data, r.id);
    v_criadas := v_criadas + 1;

    update public.quadro_tarefas_recorrencias
    set proxima_data = case r.frequencia
        when 'diaria' then r.proxima_data + (r.intervalo::text || ' days')::interval
        when 'semanal' then r.proxima_data + (r.intervalo::text || ' weeks')::interval
        when 'mensal' then r.proxima_data + (r.intervalo::text || ' months')::interval
      end,
      updated_at = now()
    where id = r.id;
  end loop;

  insert into public.quadro_tarefas_recorrencia_log (status, tarefas_criadas, executado_por)
  values ('sucesso', v_criadas, p_executado_por)
  returning * into v_log;

  return v_log;
exception when others then
  insert into public.quadro_tarefas_recorrencia_log (status, mensagem, executado_por)
  values ('erro', sqlerrm, p_executado_por)
  returning * into v_log;
  return v_log;
end;
$$;

grant execute on function public.gerar_tarefas_recorrentes(uuid) to authenticated;

select cron.schedule(
  'quadro-tarefas-recorrencia',
  '10 0 * * *',
  $$select public.gerar_tarefas_recorrentes();$$
);
