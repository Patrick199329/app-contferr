-- Fase 4: Virada Mensal Automática.
--
-- Não duplicamos dados num snapshot separado: a tabela `tarefas` já é a
-- fonte única de verdade por competência (o Histórico da Fase 2.4 já lê
-- direto dela). O que falta é o comportamento explícito de "abrir o mês":
-- criar as linhas vazias de tarefas para cada cliente ativo x departamento
-- ativo na nova competência, com log de execução (sucesso ou erro) para o
-- Admin acompanhar e poder forçar manualmente se a automação falhar.

create extension if not exists pg_cron with schema extensions;

create table public.virada_log (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  status text not null check (status in ('sucesso', 'erro')),
  mensagem text,
  linhas_criadas integer not null default 0,
  executado_por uuid references public.profiles (id),
  executado_em timestamptz not null default now()
);

alter table public.virada_log enable row level security;

create policy "Admins can view virada_log"
  on public.virada_log for select
  using (public.is_admin());

grant select on public.virada_log to authenticated;
grant all on public.virada_log to service_role;

-- Idempotente (ON CONFLICT DO NOTHING) — pode rodar mais de uma vez para a
-- mesma competência sem duplicar nem sobrescrever dados já preenchidos.
-- p_executado_por fica null quando disparada pelo cron; recebe o id do
-- Admin quando disparada manualmente (Fase 4.2).
create or replace function public.executar_virada_mensal(
  p_competencia date default null,
  p_executado_por uuid default null
)
returns public.virada_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competencia date := coalesce(p_competencia, date_trunc('month', now())::date);
  v_linhas integer := 0;
  v_log public.virada_log;
begin
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores)
  select c.id, d.id, v_competencia, '{}'::jsonb
  from public.clientes c
  cross join public.departamentos d
  where c.status = 'ativo' and d.status = 'ativo'
  on conflict (cliente_id, departamento_id, competencia) do nothing;

  get diagnostics v_linhas = row_count;

  insert into public.virada_log (competencia, status, linhas_criadas, executado_por)
  values (v_competencia, 'sucesso', v_linhas, p_executado_por)
  returning * into v_log;

  return v_log;
exception when others then
  insert into public.virada_log (competencia, status, mensagem, executado_por)
  values (v_competencia, 'erro', sqlerrm, p_executado_por)
  returning * into v_log;
  return v_log;
end;
$$;

grant execute on function public.executar_virada_mensal(date, uuid) to authenticated;

-- Todo dia 1 às 00:05 (não exatamente meia-noite, para evitar concorrência
-- com outros jobs de virada de dia que costumam rodar cravado em 00:00).
select cron.schedule('virada-mensal-contferr', '5 0 1 * *', $$select public.executar_virada_mensal();$$);
